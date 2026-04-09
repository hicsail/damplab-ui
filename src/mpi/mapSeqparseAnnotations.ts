import type { Annotation as SeqparseAnnotation } from 'seqparse';
import type { Sequence } from './types';

/**
 * Maps seqparse (GenBank, etc.) features to DAMPLab / GraphQL `AnnotationInput` shape.
 */
export function mapSeqparseAnnotationsToSaved(
  annotations: SeqparseAnnotation[]
): NonNullable<Sequence['annotations']> {
  return annotations.map((a) => ({
    start: a.start,
    end: a.end,
    type: (a.type && a.type.trim()) || a.name || 'misc_feature',
    description: a.name?.trim() || undefined,
  }));
}
