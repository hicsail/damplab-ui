import { useState } from 'react';
import { 
  Box, 
  Button, 
  Modal, 
  Stack, 
  Typography 
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { Sequence } from '../mpi/models/sequence';
import { createSequencesBatch } from '../mpi/SequencesQueries';
import { parseFile } from "seqparse";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '50%',
  bgcolor: 'background.paper',
  border: '0.5px solid #000',
  boxShadow: 24,
  p: 5,
  maxHeight: '70vh',
  overflowY: 'auto',
  pb: 8
};

interface SequenceUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

const SequenceUploader = ({ open, onClose, onUploadComplete }: SequenceUploaderProps) => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [currentSeqIndex, setCurrentSeqIndex] = useState<number>(0);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setSequences([]);
    setCurrentSeqIndex(0);
    setFileName('');
    setMessage('');
    // Clear file inputs
    const fileInput = document.getElementById('seqFilePicker') as HTMLInputElement;
    const folderInput = document.getElementById('seqFolderPicker') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    if (folderInput) folderInput.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        try {
          const parsedSequences = parseFile(fileContent);
          setSequences(parsedSequences);
          setCurrentSeqIndex(0);
          setMessage('');
        } catch (error) {
          console.error("Error parsing sequences:", error);
          setMessage("Error parsing sequences");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const allSequences: Sequence[] = [];
      setMessage("");
      try {
        for (const file of Array.from(files)) {
          const reader = new FileReader();
          const fileContent = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          });
          const parsedSequences = await parseFile(fileContent);
          allSequences.push(...parsedSequences);
        }
        setSequences(allSequences);
        setCurrentSeqIndex(0);
      } catch (error) {
        console.error("Error parsing folder:", error);
        setMessage("Error parsing folder or sequences");
      }
    }
  };

  const handleNext = () => {
    if (currentSeqIndex < sequences.length - 1) {
      setCurrentSeqIndex(currentSeqIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSeqIndex > 0) {
      setCurrentSeqIndex(currentSeqIndex - 1);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await createSequencesBatch(sequences);
      if (!result) {
        setMessage("Error importing sequences");
        return;
      }
      
      setMessage(`${sequences.length} sequence${sequences.length === 1 ? '' : 's'} imported successfully`);
      onUploadComplete?.();
      
      // Reset state after successful import
      setTimeout(() => {
        resetState();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error importing sequences:", error);
      setMessage("Error importing sequences");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const currentSeq = sequences[currentSeqIndex];

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Stack direction="column" spacing={3} alignItems='center'>
          <Typography variant="h4">
            Import Sequences
          </Typography>
          <Typography variant="body1">
            Upload a file or folder containing sequence data.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <input
              type="file"
              accept=".seq,.gb,.gbk,.genbank,.ape,.fasta,.fas,.fa,.dna"
              onChange={handleFileChange}
              id='seqFilePicker'
              style={{ display: 'none' }}
            />
            <label htmlFor='seqFilePicker'>
              <Button
                component="span"
                variant='contained'
                startIcon={<FileUploadIcon />}
              >
                Upload File
              </Button>
            </label>

            <input
              type="file"
              {...{ webkitdirectory: "true" }}
              multiple
              onChange={handleFolderUpload}
              id='seqFolderPicker'
              style={{ display: 'none' }}
            />
            <label htmlFor='seqFolderPicker'>
              <Button
                component="span"
                variant='contained'
                startIcon={<FileUploadIcon />}
              >
                Upload Folder
              </Button>
            </label>
          </Box>

          {fileName && <Typography variant="body2">{fileName}</Typography>}

          {currentSeq && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="h6">Sequence Preview:</Typography>
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                <pre>Name: {currentSeq.name}</pre>
                <pre>Type: {currentSeq.type}</pre>
                <pre>Sequence: {currentSeq.seq?.substring(0, 100)}...</pre>
                <pre>Annotations: {JSON.stringify(currentSeq.annotations, null, 2)}</pre>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                <Button onClick={handlePrevious} disabled={currentSeqIndex === 0}>
                  Previous
                </Button>
                <Button onClick={handleNext} disabled={currentSeqIndex >= sequences.length - 1}>
                  Next
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              onClick={handleImport}
              variant="contained"
              color="primary"
              disabled={sequences.length === 0 || loading}
            >
              {sequences.length === 1 ? 'Import Sequence' : 'Import All Sequences'}
            </Button>
            <Button
              onClick={handleClose}
              variant="contained"
              color="error"
            >
              Cancel
            </Button>
          </Box>
        </Stack>

        {message && (
          <Typography
            sx={{
              color: message.startsWith('Error') ? 'error.main' : 'success.main',
              position: 'absolute',
              bottom: 20,
              left: 0,
              width: '100%',
              textAlign: 'center'
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Modal>
  );
};

export default SequenceUploader; 