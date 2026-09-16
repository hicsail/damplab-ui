/**
 * The stored shape of a samples-spreadsheet value, kept apart from
 * `sampleSheet.ts` so that pricing and the job cards can read it without
 * pulling the `xlsx` reader into their module graph.
 */

export const SAMPLE_SHEET_PARAM_TYPE = 'sampleSheet';

export const isSampleSheetParam = (param: any): boolean => !!param && typeof param === 'object' && param.type === SAMPLE_SHEET_PARAM_TYPE;

/** The stored value of a sampleSheet parameter, once it has been uploaded. */
export interface StoredSampleSheet {
  filename: string;
  key?: string;
  contentType?: string;
  size?: number;
  sampleCount?: number;
  uploadedAt?: string;
  /** Short-lived download URL, added by the server when the job is read. */
  url?: string;
}

/**
 * The file record behind a formData value. Stored as a JSON string (like a
 * `file` parameter); comes back from the server as an object with `url`; and
 * on the canvas, before submission, is a pending-file object carrying the
 * chosen `File`. All three answer here.
 */
export const parseSampleSheetValue = (value: unknown): StoredSampleSheet | null => {
  if (value === null || value === undefined || value === '') return null;
  let parsed: any = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.filename !== 'string') return null;
  const sampleCount = typeof parsed.sampleCount === 'number' && Number.isFinite(parsed.sampleCount) ? parsed.sampleCount : undefined;
  return { ...parsed, sampleCount };
};

/** The row count on a stored value, or undefined when there is no file or no count. */
export const sampleCountFromValue = (value: unknown): number | undefined => parseSampleSheetValue(value)?.sampleCount;

export const sampleCountLabel = (count: number): string => `${count} ${count === 1 ? 'sample' : 'samples'}`;
