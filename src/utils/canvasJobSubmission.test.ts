import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADD_JOB_ATTACHMENTS, CREATE_JOB, CREATE_JOB_ATTACHMENT_UPLOAD_URLS, CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS } from '../gql/mutations';
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

describe('submitCanvasJob — members and description', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { setItem: () => {} }));
  afterEach(() => vi.unstubAllGlobals());

  const base = { workflows: [[node(null)]], edges: [], nodes: [], jobName: 'Demo', institute: 'BU', notes: '', clientDisplayName: 'Demo', attachments: [], getAccessToken: async () => 'token' };

  it('sends memberEmails and a trimmed description', async () => {
    const { client, jobInputs } = makeClient(async () => ({ data: {} }));
    await submitCanvasJob(client, { ...base, memberEmails: ['a@x.org'], description: '  For lab 4 ' });
    expect(jobInputs[0]).toMatchObject({ memberEmails: ['a@x.org'], description: 'For lab 4' });
  });

  it('omits both when empty', async () => {
    const { client, jobInputs } = makeClient(async () => ({ data: {} }));
    await submitCanvasJob(client, { ...base, memberEmails: [], description: '   ' });
    expect(jobInputs[0]).not.toHaveProperty('memberEmails');
    expect(jobInputs[0]).not.toHaveProperty('description');
  });
});

describe('submitCanvasJob — answers to hidden parameters (show-only-if rule 17)', () => {
  const kindIsPlasmid = { parameterId: 'kind', op: 'eq', optionIds: ['plasmid'] };
  const parameters = [
    { id: 'kind', name: 'Kind', type: 'dropdown', options: [{ id: 'plasmid', name: 'Plasmid' }, { id: 'oth', name: 'Other' }] },
    { id: 'vector', name: 'Vector map', type: 'file', showIf: kindIsPlasmid },
    { id: 'notes', name: 'Notes', type: 'string' }
  ];
  const conditionalNode = (kind: string) => ({
    id: 'n1',
    data: {
      id: 'n1',
      label: 'Gibson Assembly',
      serviceId: 'svc',
      parameters,
      formData: [
        { id: 'kind', type: 'dropdown', value: kind },
        { id: 'kind__otherText', type: 'string', value: kind === 'oth' ? 'Linear' : '' },
        { id: 'vector', type: 'file', value: pending('pUC19.gb') },
        { id: 'notes', type: 'string', value: 'n' }
      ],
    },
  });
  const submitNode = (client: any, kind: string) =>
    submitCanvasJob(client, {
      workflows: [[conditionalNode(kind)]], edges: [], nodes: [], jobName: 'Demo', institute: 'BU', notes: '', clientDisplayName: 'Demo', attachments: [],
      getAccessToken: async () => 'token',
    });

  it('leaves the hidden answer out of createJob and never asks to upload its file', async () => {
    const presign = vi.fn(async () => ({ data: { createWorkflowParameterUploadUrls: [] } }));
    const { client, jobInputs } = makeClient(presign);
    await submitNode(client, 'oth');
    expect(jobInputs[0].workflows[0].nodes[0].formData.map((e: any) => e.id)).toEqual(['kind', 'kind__otherText', 'notes']);
    expect(presign).not.toHaveBeenCalled();
  });

  it('sends the answer, and uploads its file, while the parameter is shown', async () => {
    const presign = vi.fn(async () => ({ data: { createWorkflowParameterUploadUrls: [] } }));
    const { client, jobInputs } = makeClient(presign);
    await submitNode(client, 'plasmid');
    expect(jobInputs[0].workflows[0].nodes[0].formData.map((e: any) => e.id)).toEqual(['kind', 'kind__otherText', 'vector', 'notes']);
    expect(presign).toHaveBeenCalledTimes(1);
  });
});

// A picked file lives only in browser memory. The canvas autosave keeps its name and row count but not the file, so
// after a reload the answer looks picked while there is nothing left to upload.
describe('a picked file that lost its file (the canvas was restored after a reload)', () => {
  const stale = () => JSON.parse(JSON.stringify(pending('Master.xlsx')));

  it('is refused at submission, naming the file and the operation, before anything is created', async () => {
    const { client, jobInputs } = makeClient(async () => ({ data: { createWorkflowParameterUploadUrls: [] } }));
    await expect(submit(client, stale())).rejects.toThrow('“Master.xlsx” (File on Gibson Assembly)');
    await expect(submit(client, [stale()])).rejects.toThrow('cannot be submitted until these files are uploaded');
    expect(jobInputs).toEqual([]);
  });
});

describe('a required file with no file', () => {
  const requiredNode = (value: unknown, type = 'file') => ({
    id: 'n1',
    data: { label: 'Gibson Assembly', parameters: [{ id: 'vector', name: 'Vector', type, required: true, tableData: { columns: [{ header: 'Name' }] } }], formData: [{ id: 'vector', name: 'Vector', type, required: true, value }] },
  });
  const submitNode = (client: any, n: any) =>
    submitCanvasJob(client, { workflows: [[n]], edges: [], nodes: [], jobName: 'Demo', institute: 'BU', notes: '', clientDisplayName: 'Demo', attachments: [], getAccessToken: async () => 'token' });

  it.each([[null, 'file'], [[], 'file'], ['', 'file'], [null, 'table']])('refuses %j on a %s parameter before anything is created', async (value, type) => {
    const { client, jobInputs } = makeClient(async () => ({ data: { createWorkflowParameterUploadUrls: [] } }));
    await expect(submitNode(client, requiredNode(value, type))).rejects.toThrow('Vector on Gibson Assembly (required, no file uploaded)');
    expect(client.mutate).not.toHaveBeenCalled();
    expect(jobInputs).toEqual([]);
  });
});

describe('a file picked on a catalog parameter with no id', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { setItem: () => {} }));
  afterEach(() => vi.unstubAllGlobals());

  it('is uploaded, not sent as a placeholder', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const { client, jobInputs } = makeClient(async () => ({
      data: { createWorkflowParameterUploadUrls: [{ clientToken: '', filename: 'a.fa', uploadUrl: 'https://s3/a', key: 'workflow-parameters/u/a.fa', contentType: 'text/plain', size: 4 }] },
    }));
    client.mutate.mockImplementationOnce(async ({ variables }: any) => ({
      data: { createWorkflowParameterUploadUrls: [{ clientToken: variables.files[0].clientToken, filename: 'a.fa', uploadUrl: 'https://s3/a', key: 'workflow-parameters/u/a.fa', contentType: 'text/plain', size: 4 }] },
    }));
    const idless = { id: 'n1', data: { label: 'Op', parameters: [{ name: 'Vector', type: 'file' }], formData: [{ id: 'random', name: 'Vector', type: 'file', value: pending('a.fa') }] } };
    await submitCanvasJob(client, { workflows: [[idless]], edges: [], nodes: [], jobName: 'Demo', institute: 'BU', notes: '', clientDisplayName: 'Demo', attachments: [], getAccessToken: async () => 'token' });
    const stored = jobInputs[0].workflows[0].nodes[0].formData.find((e: any) => e.id === 'random');
    expect(JSON.parse(stored.value).key).toBe('workflow-parameters/u/a.fa');
  });
});

// Attachments are uploaded after the job exists, so a failure cannot undo the job — but it must be reported, and an
// attachment is registered on the job only once its file is really stored.
describe('job attachments', () => {
  beforeEach(() => vi.stubGlobal('localStorage', { setItem: () => {} }));
  afterEach(() => vi.unstubAllGlobals());

  const fileOf = (name: string) => new File(['x'], name, { type: 'text/plain' });
  const clientFor = (slots: Array<{ filename: string; size: number }>) => {
    const registered: any[] = [];
    const mutate = vi.fn(async ({ mutation, variables }: any) => {
      if (mutation === CREATE_JOB) return { data: { createJob: { id: 'job1', jobId: 'J-1' } } };
      if (mutation === CREATE_JOB_ATTACHMENT_UPLOAD_URLS)
        return { data: { createJobAttachmentUploadUrls: slots.map((s) => ({ ...s, uploadUrl: `https://s3/${s.filename}`, key: `job-attachments/${s.filename}`, contentType: 'text/plain' })) } };
      if (mutation === ADD_JOB_ATTACHMENTS) registered.push(...variables.attachments);
      return { data: {} };
    });
    return { client: { mutate } as any, registered };
  };
  const submitWith = (client: any, attachments: File[]) =>
    submitCanvasJob(client, {
      workflows: [[node('')]], edges: [], nodes: [], jobName: 'Demo', institute: 'BU', notes: '', clientDisplayName: 'Demo',
      attachments, getAccessToken: async () => 'token',
    });

  it('registers every attachment that uploaded, and reports none failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const { client, registered } = clientFor([{ filename: 'a.txt', size: 1 }]);
    const result = await submitWith(client, [fileOf('a.txt')]);
    expect(registered.map((a) => a.filename)).toEqual(['a.txt']);
    expect(result.failedAttachments).toBeUndefined();
  });

  it('reports — and never registers — an attachment whose upload failed or that got no upload slot of its own', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: !url.endsWith('b.txt') })));
    // The server renamed "c d.txt", so that slot matches no picked file: it must not be registered without a file.
    const { client, registered } = clientFor([{ filename: 'a.txt', size: 1 }, { filename: 'b.txt', size: 1 }, { filename: 'c_d.txt', size: 1 }]);
    const result = await submitWith(client, [fileOf('a.txt'), fileOf('b.txt'), fileOf('c d.txt')]);
    expect(registered.map((a) => a.filename)).toEqual(['a.txt']);
    expect(result).toMatchObject({ id: 'job1', failedAttachments: ['b.txt', 'c d.txt'] });
  });

  it('reports every attachment when they could not be registered on the job', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const { client } = clientFor([{ filename: 'a.txt', size: 1 }]);
    const original = client.mutate;
    client.mutate = vi.fn(async (args: any) => (args.mutation === ADD_JOB_ATTACHMENTS ? Promise.reject(new Error('down')) : original(args)));
    expect((await submitWith(client, [fileOf('a.txt')])).failedAttachments).toEqual(['a.txt']);
  });
});
