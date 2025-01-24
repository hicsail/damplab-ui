import SeqViz from 'seqviz';
import { Box, Modal } from '@mui/material';
import { Sequence } from '../mpi/models/sequence';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  height: 500,
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  borderRadius: '16px'
};

interface SequenceViewerProps {
  onClose: () => void;
  open: boolean;
  sequence: Sequence | string;
  linear?: boolean;
}

function SequenceViewer({ onClose, sequence, open, linear }: SequenceViewerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box sx={{ ...style, p: linear ? 4 : 0 }}>
        <SeqViz
          style={{ height: "100%" }}
          name={typeof sequence === "string" ? "" : sequence.name}
          seq={typeof sequence === "string" ? sequence : sequence.seq}
          viewer={linear ? 'linear' : 'circular'}
          annotations={typeof sequence === "string" ? [] : sequence.annotations}
        />
      </Box>
    </Modal>
  );
}

export default SequenceViewer; 