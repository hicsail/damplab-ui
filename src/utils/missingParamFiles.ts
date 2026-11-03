import { isTableParam, tableIsSetUp } from './sampleSheetValue';
import { withoutHiddenAnswers } from './parameterConditions';

/**
 * A picked file whose file is gone: a saved canvas and the autosave keep a placeholder's name and row count, never the
 * file, so after a load or reload there is nothing left to upload. The placeholder is kept on the canvas on purpose: it
 * is what lets the form, the canvas and checkout name the file that has to be uploaded again.
 */
export const isStalePendingFile = (value: unknown): boolean =>
  !!value && typeof value === 'object' && (value as { __kind?: unknown }).__kind === 'pending-file' && !((value as { file?: unknown }).file instanceof File);

/** The message under a parameter whose file has to be uploaded again. */
export const FILE_NEEDS_REUPLOAD_MESSAGE = 'This file was not saved. Upload it again, or remove it, before submitting.';

export type ParamFileRef = {
  operation: string;
  parameter: string;
  /** The file's name. Absent when a required file was never picked. */
  filename?: string;
};

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);
const isBlank = (value: unknown): boolean => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

/** Every shown form entry of the nodes, with the names to report it under and its definition. */
function shownEntries(nodes: ReadonlyArray<any>): Array<{ entry: any; definition: any; operation: string; parameter: string }> {
  return nodes.flatMap((node) => {
    const parameters: any[] = Array.isArray(node?.data?.parameters) ? node.data.parameters : [];
    const formData: any[] = Array.isArray(node?.data?.formData) ? node.data.formData : [];
    return withoutHiddenAnswers(parameters, formData)
      .filter((entry: any) => !!entry)
      .map((entry: any) => {
        const definition = parameters.find((p) => p?.id === entry.id);
        return { entry, definition, operation: node?.data?.label ?? 'an operation', parameter: entry.name ?? definition?.name ?? 'File' };
      });
  });
}

/**
 * What stops these nodes being submitted for want of a file: every file that has to be uploaded again, whether its
 * parameter is required or not, and every required file parameter with no file. A Table that is not set up cannot be
 * answered, so it is never required. A hidden parameter counts for nothing.
 */
export function missingParamFiles(nodes: ReadonlyArray<any>): ParamFileRef[] {
  const missing: ParamFileRef[] = [];
  for (const { entry, definition, operation, parameter } of shownEntries(nodes)) {
    const values = asList(entry.value);
    const stale = values.filter(isStalePendingFile);
    for (const file of stale) missing.push({ operation, parameter, filename: (file as { filename?: string }).filename || 'file' });
    if (stale.length > 0 || !entry.required) continue;
    const type = entry.type ?? definition?.type;
    const isTable = isTableParam({ ...entry, type });
    if (type !== 'file' && !isTable) continue;
    if (isTable && !tableIsSetUp({ ...entry, ...(definition ?? {}) })) continue;
    if (values.every(isBlank)) missing.push({ operation, parameter });
  }
  return missing;
}

/** Every file picked on these nodes that a saved canvas will not keep, shown parameters only. */
export function pickedParamFiles(nodes: ReadonlyArray<any>): ParamFileRef[] {
  return shownEntries(nodes).flatMap(({ entry, operation, parameter }) =>
    asList(entry.value)
      .filter((value: any) => value && typeof value === 'object' && value.__kind === 'pending-file')
      .map((value: any) => ({ operation, parameter, filename: value.filename || 'file' }))
  );
}

/** One line naming a file or a required file parameter. */
export const paramFileLine = ({ operation, parameter, filename }: ParamFileRef): string =>
  filename ? `“${filename}” (${parameter} on ${operation})` : `${parameter} on ${operation} (required, no file uploaded)`;

/** Submission's refusal. */
export const missingParamFilesMessage = (missing: ReadonlyArray<ParamFileRef>): string =>
  `This job cannot be submitted until these files are uploaded: ${missing.map(paramFileLine).join('; ')}. A saved or reloaded job does not keep its files.`;
