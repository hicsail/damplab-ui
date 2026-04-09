import { Box, Typography } from '@mui/material';
import SeqViz from 'seqviz';
import type { Sequence } from '../mpi/types';

/** Matches seqviz `AnnotationProp` (name + range). */
interface SeqVizAnnotationInput {
  name: string;
  start: number;
  end: number;
  direction?: number;
}

function annotationsToSeqViz(
  annotations?: Sequence['annotations']
): SeqVizAnnotationInput[] {
  if (!annotations?.length) return [];
  return annotations.map((a) => ({
    name: (a.description?.trim() || a.type || 'feature').slice(0, 200),
    start: a.start,
    end: a.end,
    direction: 1,
  }));
}

function seqTypeForViewer(
  t: Sequence['type']
): 'dna' | 'rna' | 'aa' | undefined {
  if (t === 'dna' || t === 'rna' || t === 'aa') return t;
  return undefined;
}

interface SequenceSeqVizViewerProps {
  name: string;
  sequence: Pick<Sequence, 'seq' | 'type' | 'annotations'>;
  /** Linear avoids split layout; seqviz needs a non-zero parent height (see README / resize detector). */
  viewer?: 'linear' | 'both';
}

/**
 * Wraps Lattice SeqViz for DAMPLab sequence + stored annotation features.
 * The outer box uses a fixed pixel height so react-resize-detector gets a non-zero size (otherwise the viewer is blank).
 */
export default function SequenceSeqVizViewer({
  name,
  sequence,
  viewer = 'linear',
}: SequenceSeqVizViewerProps) {
  const seq = sequence.seq?.trim() ?? '';
  if (!seq) {
    return (
      <Typography variant="body2" color="text.secondary">
        No sequence to display.
      </Typography>
    );
  }

  const annotations = annotationsToSeqViz(sequence.annotations);
  const seqType = seqTypeForViewer(sequence.type);
  const effectiveViewer = seq.length > 14000 ? 'linear' : viewer;

  return (
    <Box
      sx={{
        width: '100%',
        height: 480,
        minHeight: 480,
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <SeqViz
        key={`${seq.length}-${seq.slice(0, 24)}`}
        name={name}
        seq={seq}
        {...(seqType ? { seqType } : {})}
        annotations={annotations}
        primers={[]}
        viewer={effectiveViewer}
        showIndex
        style={{ height: '100%', width: '100%' }}
        zoom={{ linear: 50 }}
      />
    </Box>
  );
}
