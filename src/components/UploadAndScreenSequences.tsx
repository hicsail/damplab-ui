import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useState, useEffect } from 'react';
import { screenSequencesBatch } from '../mpi/SecureDNAQueries';
import { Sequence } from '../mpi/models/sequence';
import { Region } from '../mpi/types';
import { createSequence } from '../mpi/SequencesQueries';
import { parseFile } from "seqparse";
import FileUploadIcon from '@mui/icons-material/FileUpload';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 800,
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: '16px',
  maxHeight: '80vh',
  overflowY: 'auto'
};

interface UploadAndScreenSequencesProps {
  open: boolean;
  onClose: () => void;
  onScreeningComplete: () => void;
}

function UploadAndScreenSequences({ open, onClose, onScreeningComplete }: UploadAndScreenSequencesProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region>(Region.ALL);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      setSequences([]);
      setSelectedRegion(Region.ALL);
      setMessage('');
      setError(false);
      setIsProcessing(false);
    }
  }, [open]);

  const handleRegionSelection = (event: any) => {
    setSelectedRegion(event.target.value);
  };

  const handleClose = () => {
    setSequences([]);
    setSelectedRegion(Region.ALL);
    setMessage('');
    setError(false);
    setIsProcessing(false);
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        try {
          const parsedSequences = parseFile(fileContent);
          setSequences(parsedSequences);
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
      } catch (error) {
        console.error("Error parsing folder:", error);
        setMessage("Error parsing folder or sequences");
      }
    }
  };

  const handleScreening = async () => {
    if (sequences.length === 0) return;

    setIsProcessing(true);
    setError(false);
    setMessage('');

    try {
      // Create sequences one by one and collect their IDs
      const sequenceIds: string[] = [];
      for (const seq of sequences) {
        const createdSeq = await createSequence(seq);
        if (!createdSeq?.id) {
          throw new Error(`Failed to create sequence: ${seq.name}`);
        }
        sequenceIds.push(createdSeq.id);
      }

      // Then start the screening process with all sequence IDs
      const screeningResult = await screenSequencesBatch(sequenceIds, selectedRegion);
      
      if (screeningResult) {
        setMessage('The biosecurity check is running in the background. Results will be shown in the SecureDNA screenings table.');
        onScreeningComplete();
        setTimeout(handleClose, 2000); // Close after 2 seconds
      } else {
        throw new Error('Failed to start screening');
      }
    } catch (e) {
      console.error('Error during screening process:', e);
      setError(true);
      setMessage('An error occurred during the screening process.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Stack spacing={6} direction="column" alignItems="center">
          <Typography variant="h4">
            Upload and Screen Sequences
          </Typography>
          
          <Typography variant="body1" sx={{ textAlign: 'center' }}>
            Upload your sequences and run a biosecurity screening using SecureDNA's algorithm.<br/><br/>
            Sequences must be at least 50 base pairs in length.
          </Typography>

          {sequences.length === 0 ? (
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
          ) : (
            <>
              <Box sx={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Length</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sequences.map((seq, index) => (
                      <TableRow key={index}>
                        <TableCell>{seq.name}</TableCell>
                        <TableCell>{seq.seq.length} bp</TableCell>
                        <TableCell>{getFormattedDate(new Date().toISOString())}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <FormControl size="small" sx={{ width: '100%', mt: 2 }}>
                <InputLabel id="region-label">Select region</InputLabel>
                <Select
                  label="Select region"
                  sx={{ minWidth: 150 }}
                  value={selectedRegion}
                  onChange={handleRegionSelection}
                >
                  {Object.values(Region).map((region) => (
                    <MenuItem key={region} value={region}>{region.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleScreening}
                  disabled={isProcessing || sequences.length === 0}
                >
                  {isProcessing ? 'Processing...' : 'Screen Sequences'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setSequences([])}
                  disabled={isProcessing}
                >
                  Clear
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </Box>
            </>
          )}

          {message && (
            <Typography
              sx={{
                color: error ? 'error.main' : 'success.main',
                textAlign: 'center'
              }}
            >
              {message}
            </Typography>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}

export default UploadAndScreenSequences; 