import type { ApolloClient } from '@apollo/client';
import { CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS } from '../gql/mutations';
import { isPendingParamFile, type PendingParamFile } from './canvasJobSubmission';

/**
 * Upload every file picked in the job editor before saveJobWorkflows, and put
 * the stored reference in its place. Keys are minted under this caller's own
 * prefix, which is what the server's key check (B20) accepts. Unlike checkout
 * there is no "name only" dev fallback: an editor save that silently lost the
 * file would replace a real sheet with nothing.
 */
export async function uploadPendingParamFiles(client: Pick<ApolloClient<object>, 'mutate'>, workflows: any[]): Promise<any[]> {
  const pending: Array<{ token: string; file: PendingParamFile }> = [];
  const copy = workflows.map((workflow) => ({
    ...workflow,
    nodes: (workflow?.nodes ?? []).map((node: any) => ({
      ...node,
      formData: (node?.formData ?? []).map((entry: any) => {
        const tag = (value: unknown) => {
          if (!isPendingParamFile(value)) return value;
          const token = `${node.id}:${entry.id}:${pending.length}`;
          pending.push({ token, file: value });
          return { __pendingToken: token };
        };
        return { ...entry, value: Array.isArray(entry?.value) ? entry.value.map(tag) : tag(entry?.value) };
      })
    }))
  }));
  if (pending.length === 0) return workflows;

  const { data } = await client.mutate({
    mutation: CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS,
    variables: { files: pending.map(({ token, file }) => ({ clientToken: token, filename: file.filename, contentType: file.contentType || 'application/octet-stream', size: file.size })) }
  });
  const uploads = new Map<string, any>((data?.createWorkflowParameterUploadUrls ?? []).map((u: any) => [u.clientToken, u]));

  const stored = new Map<string, string>();
  await Promise.all(
    pending.map(async ({ token, file }) => {
      const upload = uploads.get(token);
      if (!upload?.uploadUrl) throw new Error(`No upload URL was returned for ${file.filename}.`);
      const response = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': upload.contentType || 'application/octet-stream' }, body: file.file });
      if (!response.ok) throw new Error(`${file.filename} could not be uploaded (${response.status}).`);
      stored.set(
        token,
        JSON.stringify({
          filename: upload.filename ?? file.filename,
          key: upload.key,
          contentType: upload.contentType ?? file.contentType,
          size: upload.size ?? file.size,
          uploadedAt: new Date().toISOString(),
          ...(typeof file.sampleCount === 'number' ? { sampleCount: file.sampleCount } : {})
        })
      );
    })
  );

  const resolve = (value: any) => (value && typeof value === 'object' && typeof value.__pendingToken === 'string' ? stored.get(value.__pendingToken) ?? null : value);
  return copy.map((workflow) => ({
    ...workflow,
    nodes: workflow.nodes.map((node: any) => ({
      ...node,
      formData: node.formData.map((entry: any) => ({ ...entry, value: Array.isArray(entry.value) ? entry.value.map(resolve) : resolve(entry.value) }))
    }))
  }));
}
