import { Box, Modal, Stack, Typography } from '@mui/material';
import DangerousIcon from '@mui/icons-material/Dangerous';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 300,
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  borderRadius: '16px',
  padding: 4
};

interface ErrorModalProps {
  onClose: () => void;
  open: boolean;
  message: string;
}

function ErrorModal({ onClose, message, open }: ErrorModalProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
    >
      <Box sx={style}>
        <Stack direction="column" spacing={2} alignItems='center'>
          <DangerousIcon sx={{ color: 'red', fontSize: 80 }} />
          <Typography variant="h5" textAlign='center'>
            {message}
          </Typography>
        </Stack>
      </Box>
    </Modal>
  );
}
export default ErrorModal;
