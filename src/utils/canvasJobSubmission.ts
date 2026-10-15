import type { ApolloClient } from '@apollo/client';
import type { Edge, Node } from 'reactflow';
import {
  ADD_JOB_ATTACHMENTS,
  CREATE_JOB,
  CREATE_JOB_ATTACHMENT_UPLOAD_URLS,
  CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS,
} from '../gql/mutations';
import { transformEdgesToGQL, transformNodesToGQL } from '../controllers/GraphHelpers';
import { isTableParam } from './sampleSheet';
import { withoutHiddenAnswers } from './parameterConditions';

export type PendingParamFile = {
  __kind: 'pending-file';
  localId: string;
  file: File;
  filename: string;
  contentType: string;
  size: number;
  /** Set on a samples spreadsheet: rows below the header, read when it was picked. */
  sampleCount?: number;
};

type UploadedParamFile = {
  filename: string;
  /** Absent when the file was never stored (local dev without a bucket); see allowUnstoredParamFiles. */
  key?: string;
  /** Set instead of `key` when the upload was skipped. */
  notUploaded?: true;
  contentType: string;
  size: number;
  uploadedAt: string;
  sampleCount?: number;
};

/**
 * On the local dev server a parameter file that can't be stored (no bucket
 * configured, MinIO not running) is recorded by name only instead of failing
 * the submission. Deployed builds still fail, so a real job never silently
 * loses a file.
 */
const allowUnstoredParamFiles = import.meta.env.DEV;

export const isPendingParamFile = (value: unknown): value is PendingParamFile =>
  !!value &&
  typeof value === 'object' &&
  (value as PendingParamFile).__kind === 'pending-file' &&
  (value as PendingParamFile).file instanceof File;

/**
 * A picked file whose file is gone: the canvas autosave keeps a placeholder's name and row count, never the file,
 * so after a reload it still looks picked while there is nothing to upload.
 */
export const isStalePendingFile = (value: unknown): boolean =>
  !!value && typeof value === 'object' && (value as PendingParamFile).__kind === 'pending-file' && !((value as PendingParamFile).file instanceof File);

/**
 * A restored canvas without its stale placeholders: an answer that was one becomes empty (or drops out of a list),
 * so the form asks for the file again instead of looking done. Nodes with none are returned as they were.
 */
export function withoutStalePendingFiles<N extends { data?: any }>(nodes: N[]): N[] {
  return nodes.map((node) => {
    const formData = node?.data?.formData;
    if (!Array.isArray(formData)) return node;
    let changed = false;
    const cleaned = formData.map((entry: any) => {
      if (Array.isArray(entry?.value)) {
        const kept = entry.value.filter((v: unknown) => !isStalePendingFile(v));
        if (kept.length === entry.value.length) return entry;
        changed = true;
        return { ...entry, value: kept };
      }
      if (!isStalePendingFile(entry?.value)) return entry;
      changed = true;
      return { ...entry, value: null };
    });
    return changed ? { ...node, data: { ...node.data, formData: cleaned } } : node;
  });
}

export type SubmitCanvasJobInput = {
  workflows: any[];
  edges: Edge[];
  nodes: Node[];
  jobName: string;
  institute: string;
  notes: string;
  clientDisplayName: string;
  clientEmail?: string;
  memberEmails?: string[];
  description?: string;
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
): Promise<{ id: string; jobId?: string; failedAttachments?: string[] }> {
  const {
    workflows,
    edges,
    nodes,
    jobName,
    institute,
    notes,
    clientDisplayName,
    clientEmail,
    memberEmails,
    description,
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
          // Answers to hidden parameters are left out — before files are collected,
          // so a file picked for a parameter that is now hidden is never uploaded.
          // The server discards them too; this only keeps the request honest.
          formData: Array.isArray(node.data?.formData)
            ? withoutHiddenAnswers(node.data?.parameters, node.data.formData).map((entry: any) => ({ ...entry }))
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
      sampleCount?: number;
    }> = [];

    const addFileForUpload = (file: PendingParamFile): string => {
      const clientToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      filesToUpload.push({
        clientToken,
        file: file.file,
        contentType: file.contentType || 'application/octet-stream',
        size: file.size,
        ...(typeof file.sampleCount === 'number' ? { sampleCount: file.sampleCount } : {}),
      });
      return clientToken;
    };

    const fileTokenLookup = new Map<string, string | string[]>();

    clonedWorkflows.forEach((workflow: any) => {
      const wfNodes = Array.isArray(workflow) ? workflow : [workflow];
      wfNodes.forEach((node: any) => {
        const parameters = Array.isArray(node.data?.parameters) ? node.data.parameters : [];
        // A samples spreadsheet is uploaded exactly like a file parameter; the
        // only difference is the count that rides along in its stored value.
        const fileParamIds = new Set(
          parameters
            .filter((p: any) => (p?.type === 'file' || isTableParam(p)) && typeof p.id === 'string')
            .map((p: any) => p.id)
        );
        (node.data.formData || []).forEach((entry: any) => {
          if (!fileParamIds.has(entry.id)) return;
          // Never save a placeholder as the answer: the job would have no file to download.
          const stale = (Array.isArray(entry.value) ? entry.value : [entry.value]).find(isStalePendingFile);
          if (stale) {
            throw new Error(`The file “${stale.filename || 'file'}” on “${node.data?.label ?? 'an operation'}” needs to be picked again: a saved or reloaded canvas does not keep its files.`);
          }
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

    type ParamUpload = {
      clientToken: string;
      filename: string;
      uploadUrl: string;
      key: string;
      contentType: string;
      size: number;
    };

    let uploads: ParamUpload[] = [];
    try {
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
      uploads = uploadMetaResult.data?.createWorkflowParameterUploadUrls ?? [];
    } catch (e) {
      if (!allowUnstoredParamFiles) throw e;
      console.warn('[dev] Parameter file storage unavailable; submitting file names only.', e);
    }
    const uploadByToken = new Map(uploads.map((u) => [u.clientToken, u]));

    const storedTokens = new Set<string>();
    await Promise.all(
      filesToUpload.map(async (f) => {
        const upload = uploadByToken.get(f.clientToken);
        try {
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
          storedTokens.add(f.clientToken);
        } catch (e) {
          if (!allowUnstoredParamFiles) throw e;
          if (upload) console.warn(`[dev] Could not store ${f.file.name}; submitting its name only.`, e);
        }
      })
    );

    const sampleCountByToken = new Map(filesToUpload.filter((f) => typeof f.sampleCount === 'number').map((f) => [f.clientToken, f.sampleCount as number]));
    const uploadedMetaByToken = new Map<string, UploadedParamFile>();
    filesToUpload.forEach((f) => {
      const sampleCount = sampleCountByToken.get(f.clientToken);
      const upload = uploadByToken.get(f.clientToken);
      const stored = storedTokens.has(f.clientToken) && upload;
      uploadedMetaByToken.set(f.clientToken, {
        filename: stored ? upload.filename : f.file.name,
        ...(stored ? { key: upload.key } : { notUploaded: true as const }),
        contentType: stored ? upload.contentType : f.contentType,
        size: stored ? upload.size : f.size,
        uploadedAt: new Date().toISOString(),
        ...(sampleCount !== undefined ? { sampleCount } : {}),
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

  const data: Record<string, unknown> = {
    name: jobName,
    clientDisplayName,
    institute,
    notes,
    ...(clientEmail ? { clientEmail } : {}),
    ...(memberEmails && memberEmails.length > 0 ? { memberEmails } : {}),
    ...(description?.trim() ? { description: description.trim() } : {}),
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

  // Attachments go up after the job exists, so a failure cannot undo the job: each one that is not stored is reported
  // back by name, and only an attachment whose file really uploaded is registered on the job.
  const failedAttachments: string[] = [];
  if (attachments.length > 0) {
    const uploaded: any[] = [];
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

      const attachmentUploads: any[] = uploadUrlResult.data?.createJobAttachmentUploadUrls ?? [];
      const unclaimed = [...attachments];
      const slots = attachmentUploads.map((u) => {
        const at = unclaimed.findIndex((f) => f.name === u.filename && f.size === u.size);
        return { u, file: at >= 0 ? unclaimed.splice(at, 1)[0] : undefined };
      });
      // A picked file no slot matches was never uploaded.
      failedAttachments.push(...unclaimed.map((f) => f.name));

      await Promise.all(
        slots.map(async ({ u, file }) => {
          if (!file) return;
          try {
            const resp = await fetch(u.uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': u.contentType || 'application/octet-stream',
              },
              body: file,
            });
            if (resp.ok) uploaded.push(u);
            else failedAttachments.push(file.name);
          } catch {
            failedAttachments.push(file.name);
          }
        })
      );

      const attachmentInputs = uploaded.map((u: any) => ({
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
      for (const file of attachments) if (!failedAttachments.includes(file.name)) failedAttachments.push(file.name);
    }
  }

  return { id: createdId, jobId: createdJobId ?? undefined, ...(failedAttachments.length > 0 ? { failedAttachments: attachments.map((f) => f.name).filter((name) => failedAttachments.includes(name)) } : {}) };
}
