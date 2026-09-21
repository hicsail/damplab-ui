import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CREATE_JOB, CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS } from '../gql/mutations';
import { submitCanvasJob, PendingParamFile } from './canvasJobSubmission';

const service = { id: 'svc', parameters: [{ id: 'vector', type: 'file' }] };

const pending = (name: string): PendingParamFile => {
  const file = new File(['ATGC'], name, { type: 'application/octet-stream' });
  return { __kind: 'pending-file', localId: name, file, filename: name, contentType: file.type, size: file.size };
};

const node = (value: unknown) => ({
  id: 'n1',
  data: {
    id: 'n1',
    label: 'Gibson Assembly',
    serviceId: 'svc',
    parameters: service.parameters,
    formData: [{ id: 'vector', type: 'file', value }],
  },
});

const makeClient = (presign: () => Promise<any>) => {
  const jobInputs: any[] = [];
  const mutate = vi.fn(async ({ mutation, variables }: any) => {
    if (mutation === CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS) return presign();
    if (mutation === CREATE_JOB) {
      jobInputs.push(variables.createJobInput);
      return { data: { createJob: { id: 'job1', jobId: 'J-1' } } };
    }
    return { data: {} };
  });
  return { client: { mutate } as any, jobInputs };
};

const submit = (client: any, value: unknown) =>
  submitCanvasJob(client, {
    workflows: [[node(value)]],
    edges: [],
    nodes: [],
    jobName: 'Demo',
    institute: 'BU',
    notes: '',
    clientDisplayName: 'Demo',
    attachments: [],
    getAccessToken: async () => 'token',
  });

const submittedVector = (jobInputs: any[]) => {
  const formData = jobInputs[0].workflows[0].nodes[0].formData;
  const entry = (Array.isArray(formData) ? formData : []).find((e: any) => e.id === 'vector');
  return JSON.parse(entry.value);
};

describe('submitCanvasJob parameter files (dev server)', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { setItem: () => {} }));
  afterEach(() => vi.unstubAllGlobals());

  it('submits the file name only when the server has no storage configured', async () => {
    const { client, jobInputs } = makeClient(async () => {
      throw new Error('Workflow parameter file storage is not configured on the server.');
    });

    await expect(submit(client, pending('pUC19.gb'))).resolves.toEqual({ id: 'job1', jobId: 'J-1' });
    const meta = submittedVector(jobInputs);
    expect(meta).toMatchObject({ filename: 'pUC19.gb', notUploaded: true });
    expect(meta.key).toBeUndefined();
  });

  it('submits the file name only when the upload to storage fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const { client, jobInputs } = makeClient(async () => {
      const token = (client.mutate as any).mock.calls[0][0].variables.files[0].clientToken;
      return {
        data: {
          createWorkflowParameterUploadUrls: [
            { clientToken: token, filename: 'pUC19.gb', uploadUrl: 'http://localhost:9000/x', key: 'k1', contentType: 'application/octet-stream', size: 4 },
          ],
        },
      };
    });

    await expect(submit(client, pending('pUC19.gb'))).resolves.toMatchObject({ id: 'job1' });
    expect(fetch).toHaveBeenCalledTimes(1);
    const meta = submittedVector(jobInputs);
    expect(meta).toMatchObject({ filename: 'pUC19.gb', notUploaded: true });
    expect(meta.key).toBeUndefined();
  });

  it('records the storage key when the upload succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const { client, jobInputs } = makeClient(async () => {
      const token = (client.mutate as any).mock.calls[0][0].variables.files[0].clientToken;
      return {
        data: {
          createWorkflowParameterUploadUrls: [
            { clientToken: token, filename: 'pUC19.gb', uploadUrl: 'http://localhost:9000/x', key: 'k1', contentType: 'application/octet-stream', size: 4 },
          ],
        },
      };
    });

    await submit(client, pending('pUC19.gb'));
    const meta = submittedVector(jobInputs);
    expect(meta).toMatchObject({ filename: 'pUC19.gb', key: 'k1' });
    expect(meta.notUploaded).toBeUndefined();
  });
});
