import { Box, Button, Modal, Typography } from '@mui/material';
import SequenceSeqVizViewer from './SequenceSeqVizViewer';
import type { Sequence } from '../securedna/types';

export interface SequenceSeqVizModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  sequence: Pick<Sequence, 'seq' | 'type' | 'annotations'>;
}

const modalBoxSx = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '96vw', sm: 940 },
  maxWidth: 960,
  maxHeight: '92vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 24,
  p: 2,
  borderRadius: 2,
};

/**
 * Full-screen-style modal that only contains the SeqViz map (opened from the eye icon).
 */
export default function SequenceSeqVizModal({
  open,
  onClose,
  name,
  sequence,
}: SequenceSeqVizModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <Box sx={modalBoxSx}>
        <Typography variant="h6" sx={{ mb: 1, pr: 4 }} noWrap title={name}>
          {name}
        </Typography>
        <SequenceSeqVizViewer name={name} sequence={sequence} viewer="both" />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
