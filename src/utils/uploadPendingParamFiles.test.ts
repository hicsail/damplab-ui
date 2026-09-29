import { afterEach, describe, expect, it, vi } from 'vitest';
import { CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS } from '../gql/mutations';
import { uploadPendingParamFiles } from './uploadPendingParamFiles';

const pending = (name: string, sampleCount?: number) => {
  const file = new File(['a,b\n1,2'], name, { type: 'text/csv' });
  return { __kind: 'pending-file', localId: name, file, filename: name, contentType: 'text/csv', size: file.size, ...(sampleCount !== undefined ? { sampleCount } : {}) };
};

const client = () => {
  const mutate = vi.fn(async ({ mutation, variables }: any) => {
    expect(mutation).toBe(CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS);
    return { data: { createWorkflowParameterUploadUrls: variables.files.map((f: any) => ({ clientToken: f.clientToken, filename: f.filename, uploadUrl: `http://s3/${f.clientToken}`, key: `workflow-parameters/me/${f.filename}`, contentType: f.contentType, size: f.size })) } };
  });
  return { mutate } as any;
};

describe('uploadPendingParamFiles (editor save)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uploads each pending file and stores its key, filename and sample count', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const workflows = [{ nodes: [{ id: 'n1', formData: [{ id: 'sheet', value: pending('samples.csv', 1) }, { id: 'vol', value: 5 }] }] }];
    const out = await uploadPendingParamFiles(client(), workflows);
    const stored = JSON.parse(out[0].nodes[0].formData[0].value);
    expect(stored).toMatchObject({ filename: 'samples.csv', key: 'workflow-parameters/me/samples.csv', sampleCount: 1 });
    expect(out[0].nodes[0].formData[1]).toEqual({ id: 'vol', value: 5 });
    expect(workflows[0].nodes[0].formData[0].value).toHaveProperty('__kind', 'pending-file');
  });

  it('does nothing without pending files', async () => {
    const c = client();
    const workflows = [{ nodes: [{ id: 'n1', formData: [{ id: 'vol', value: 5 }] }] }];
    expect(await uploadPendingParamFiles(c, workflows)).toEqual(workflows);
    expect(c.mutate).not.toHaveBeenCalled();
  });

  it('fails the save when an upload fails, rather than saving a file that was never stored', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    await expect(uploadPendingParamFiles(client(), [{ nodes: [{ id: 'n1', formData: [{ id: 'sheet', value: pending('s.csv') }] }] }])).rejects.toThrow(/s\.csv/);
  });

  it('replaces pending files inside arrays too', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const out = await uploadPendingParamFiles(client(), [{ nodes: [{ id: 'n1', formData: [{ id: 'f', value: [pending('a.csv'), 'kept'] }] }] }]);
    const v = out[0].nodes[0].formData[0].value;
    expect(JSON.parse(v[0]).key).toBe('workflow-parameters/me/a.csv');
    expect(v[1]).toBe('kept');
  });
});
