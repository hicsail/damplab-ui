import type { ApolloClient } from '@apollo/client';
import type { Edge, Node } from 'reactflow';
import {
  ADD_JOB_ATTACHMENTS,
  CREATE_JOB,
  CREATE_JOB_ATTACHMENT_UPLOAD_URLS,
  CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS,
} from '../gql/mutations';
import { transformEdgesToGQL, transformNodesToGQL } from '../controllers/GraphHelpers';

export type PendingParamFile = {
  __kind: 'pending-file';
  localId: string;
  file: File;
  filename: string;
  contentType: string;
  size: number;
};

type UploadedParamFile = {
  filename: string;
  key: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

const isPendingParamFile = (value: unknown): value is PendingParamFile =>
  !!value &&
  typeof value === 'object' &&
  (value as PendingParamFile).__kind === 'pending-file' &&
  (value as PendingParamFile).file instanceof File;

export type SubmitCanvasJobInput = {
  workflows: any[];
  edges: Edge[];
  nodes: Node[];
  jobName: string;
  institute: string;
  notes: string;
  clientDisplayName: string;
  attachments: File[];
  getAccessToken: () => Promise<string | undefined>;
};

/**
 * Uploads workflow parameter files, creates the job, saves a local graph snapshot, and registers job attachments.
 * Does not clear canvas or navigate — callers handle post-submit UX.
 */
export async function submitCanvasJob(
  client: ApolloClient<object>,
  input: SubmitCanvasJobInput
): Promise<{ id: string; jobId?: string }> {
  const {
    workflows,
    edges,
    nodes,
    jobName,
    institute,
    notes,
    clientDisplayName,
    attachments,
    getAccessToken,
  } = input;

  const token = await getAccessToken();

  const workflowsWithUploadedParamFiles = await (async () => {
    const clonedWorkflows = workflows.map((workflow: any) => {
      const wfNodes = (Array.isArray(workflow) ? workflow : [workflow]).map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          formData: Array.isArray(node.data?.formData)
            ? node.data.formData.map((entry: any) => ({ ...entry }))
            : [],
        },
      }));
      return Array.isArray(workflow) ? wfNodes : wfNodes[0];
    });

    const filesToUpload: Array<{
      clientToken: string;
      file: File;
      contentType: string;
      size: number;
    }> = [];

    const addFileForUpload = (file: PendingParamFile): string => {
      const clientToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      filesToUpload.push({
        clientToken,
        file: file.file,
        contentType: file.contentType || 'application/octet-stream',
        size: file.size,
      });
      return clientToken;
    };

    const fileTokenLookup = new Map<string, string | string[]>();

    clonedWorkflows.forEach((workflow: any) => {
      const wfNodes = Array.isArray(workflow) ? workflow : [workflow];
      wfNodes.forEach((node: any) => {
        const parameters = Array.isArray(node.data?.parameters) ? node.data.parameters : [];
        const fileParamIds = new Set(
          parameters
            .filter((p: any) => p?.type === 'file' && typeof p.id === 'string')
            .map((p: any) => p.id)
        );
        (node.data.formData || []).forEach((entry: any) => {
          if (!fileParamIds.has(entry.id)) return;
          if (Array.isArray(entry.value)) {
            const tokens = entry.value
              .filter((v: any) => isPendingParamFile(v))
              .map((f: PendingParamFile) => addFileForUpload(f));
            if (tokens.length > 0) {
              fileTokenLookup.set(`${node.id}:${entry.id}`, tokens);
            }
            return;
          }
          if (isPendingParamFile(entry.value)) {
            const t = addFileForUpload(entry.value);
            fileTokenLookup.set(`${node.id}:${entry.id}`, t);
          }
        });
      });
    });

    if (filesToUpload.length === 0) {
      return clonedWorkflows;
    }

    const uploadMetaResult = await client.mutate({
      mutation: CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS,
      variables: {
        files: filesToUpload.map((f) => ({
          clientToken: f.clientToken,
          filename: f.file.name,
          contentType: f.contentType,
          size: f.size,
        })),
      },
      context: {
        headers: {
          authorization: token ? `Bearer ${token}` : '',
        },
      },
    });

    const uploads: Array<{
      clientToken: string;
      filename: string;
      uploadUrl: string;
      key: string;
      contentType: string;
      size: number;
    }> = uploadMetaResult.data?.createWorkflowParameterUploadUrls ?? [];
    const uploadByToken = new Map(uploads.map((u) => [u.clientToken, u]));

    await Promise.all(
      filesToUpload.map(async (f) => {
        const upload = uploadByToken.get(f.clientToken);
        if (!upload) throw new Error(`Upload URL not found for file token ${f.clientToken}`);
        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': upload.contentType || 'application/octet-stream',
          },
          body: f.file,
        });
        if (!response.ok) {
          throw new Error(`Failed to upload parameter file ${f.file.name}`);
        }
      })
    );

    const uploadedMetaByToken = new Map<string, UploadedParamFile>();
    uploads.forEach((u) => {
      uploadedMetaByToken.set(u.clientToken, {
        filename: u.filename,
        key: u.key,
        contentType: u.contentType,
        size: u.size,
        uploadedAt: new Date().toISOString(),
      });
    });

    clonedWorkflows.forEach((workflow: any) => {
      const wfNodes = Array.isArray(workflow) ? workflow : [workflow];
      wfNodes.forEach((node: any) => {
        (node.data.formData || []).forEach((entry: any) => {
          const tokenOrTokens = fileTokenLookup.get(`${node.id}:${entry.id}`);
          if (!tokenOrTokens) return;
          if (Array.isArray(tokenOrTokens)) {
            entry.value = tokenOrTokens
              .map((t) => uploadedMetaByToken.get(t))
              .filter(Boolean)
              .map((meta) => JSON.stringify(meta));
          } else {
            const meta = uploadedMetaByToken.get(tokenOrTokens);
            entry.value = meta ? JSON.stringify(meta) : null;
          }
        });
      });
    });

    return clonedWorkflows;
  })();

  const data = {
    name: jobName,
    clientDisplayName,
    institute,
    notes,
    workflows: workflowsWithUploadedParamFiles.map((workflow: any) => ({
      name: `Workflow-${workflow.id || workflow[0]?.id}`,
      nodes: transformNodesToGQL(Array.isArray(workflow) ? workflow : [workflow]),
      edges: transformEdgesToGQL(
        edges.filter((edge: any) => {
          const workflowNodes = Array.isArray(workflow) ? workflow : [workflow];
          return (
            workflowNodes.some((node: any) => node.id === edge.source) &&
            workflowNodes.some((node: any) => node.id === edge.target)
          );
        })
      ),
    })),
  };

  const jobResult = await client.mutate({
    mutation: CREATE_JOB,
    variables: { createJobInput: data },
    context: {
      headers: {
        authorization: token ? `Bearer ${token}` : '',
      },
    },
  });

  const createdId = jobResult.data?.createJob?.id;
  const createdJobId = jobResult.data?.createJob?.jobId;
  if (!createdId) {
    throw new Error('Job was created but no ID was returned.');
  }

  // Post-create side effects below should not fail the submission.
  // If the job was created successfully, callers should proceed with success UX even if these steps fail.
  try {
    const localFileName = `${createdId}_${new Date().toLocaleString()}`;
    localStorage.setItem(
      localFileName,
      JSON.stringify({
        fileName: localFileName,
        nodes,
        edges,
      })
    );
  } catch (e) {
    console.warn('Failed to save local graph snapshot:', e);
  }

  if (attachments.length > 0) {
    try {
      const filesForRequest = attachments.map((file) => ({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }));

      const uploadUrlResult = await client.mutate({
        mutation: CREATE_JOB_ATTACHMENT_UPLOAD_URLS,
        variables: {
          jobId: createdId,
          files: filesForRequest,
        },
        context: {
          headers: {
            authorization: token ? `Bearer ${token}` : '',
          },
        },
      });

      const attachmentUploads = uploadUrlResult.data?.createJobAttachmentUploadUrls ?? [];

      await Promise.all(
        attachmentUploads.map(async (u: any) => {
          const file = attachments.find((f) => f.name === u.filename && f.size === u.size);
          if (!file) {
            return;
          }
          const resp = await fetch(u.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': u.contentType || 'application/octet-stream',
            },
            body: file,
          });
          if (!resp.ok) {
            throw new Error(`Failed to upload attachment ${u.filename}`);
          }
        })
      );

      const attachmentInputs = attachmentUploads.map((u: any) => ({
        filename: u.filename,
        key: u.key,
        contentType: u.contentType,
        size: u.size,
      }));

      if (attachmentInputs.length > 0) {
        await client.mutate({
          mutation: ADD_JOB_ATTACHMENTS,
          variables: {
            jobId: createdId,
            attachments: attachmentInputs,
          },
          context: {
            headers: {
              authorization: token ? `Bearer ${token}` : '',
            },
          },
        });
      }
    } catch (e) {
      console.warn('Job created, but attachments failed to upload/register:', e);
    }
  }

  return { id: createdId, jobId: createdJobId ?? undefined };
}
