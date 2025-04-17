import { Box, Button, Modal, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useState, useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { Sequence } from '../mpi/types';
import { Region, ScreeningResult } from '../mpi/types';
import { createSequence, screenSequencesBatch, GET_USER_SCREENINGS } from '../mpi/SequencesQueries';
import { parseFile } from "seqparse";
import FileUploadIcon from '@mui/icons-material/FileUpload';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 900,
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
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const client = useApolloClient();

  useEffect(() => {
    if (!open) {
      setSequences([]);
      setMessage('');
      setError(false);
      setIsProcessing(false);
    }
  }, [open]);

  const handleClose = () => {
    setSequences([]);
    setMessage('');
    setError(false);
    setIsProcessing(false);
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target?.result as string;
        try {
          const parsedSequences = parseFile(fileContent);
          const formattedSequences: Sequence[] = parsedSequences.map(seq => ({
            id: '', // Will be set by the backend
            name: seq.name,
            type: 'unknown',
            seq: seq.seq,
            annotations: [],
            userId: '', // Will be set by the backend
            mpiId: '', // Will be set by the backend
            created_at: new Date(),
            updated_at: new Date()
          }));
          setSequences(prev => [...prev, ...formattedSequences]);
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
          // Skip directories and non-sequence files
          if (!file.name.match(/\.(seq|gb|gbk|genbank|ape|fasta|fas|fa|dna)$/i)) {
            console.log('Skipping non-sequence file:', file.name);
            continue;
          }
          
          console.log('Processing file:', file.name);
          const reader = new FileReader();
          const fileContent = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          });
          
          try {
            const parsedSequences = await parseFile(fileContent);
            console.log(`Found ${parsedSequences.length} sequences in ${file.name}`);
            const formattedSequences: Sequence[] = parsedSequences.map(seq => ({
              id: '', // Will be set by the backend
              name: seq.name,
              type: 'unknown',
              seq: seq.seq,
              annotations: [],
              userId: '', // Will be set by the backend
              mpiId: '', // Will be set by the backend
              created_at: new Date(),
              updated_at: new Date()
            }));
            allSequences.push(...formattedSequences);
          } catch (parseError) {
            console.error(`Error parsing file ${file.name}:`, parseError);
            continue; // Skip this file but continue with others
          }
        }
        
        if (allSequences.length > 0) {
          setSequences(prev => [...prev, ...allSequences]);
        } else {
          setMessage("No valid sequence files found in the folder");
        }
      } catch (error) {
        console.error("Error processing folder:", error);
        setMessage("Error processing folder or sequences");
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
        const createdSeq = await createSequence(client, seq);
        if (!createdSeq?.id) {
          throw new Error(`Failed to create sequence: ${seq.name}`);
        }
        sequenceIds.push(createdSeq.id);
      }

      // Then start the screening process with all sequence IDs
      const screeningResult = await screenSequencesBatch(client, sequenceIds, Region.ALL);
      
      if (screeningResult) {
        setMessage('Biosecurity check is running in the background. Results usually appear in the screenings table after a minute or so.');
        
        // Start polling for new results
        const pollInterval = 10000; // Poll every 10 seconds
        const maxAttempts = 18; // Maximum 3 minutes of polling
        let attempts = 0;
        
        const pollForResults = async () => {
          attempts++;
          const { data } = await client.query({ query: GET_USER_SCREENINGS });
          const currentScreenings = data.getUserScreenings;
          
          if (currentScreenings) {
            // Check if any of our sequences have results
            const hasNewResults = currentScreenings.some((screening: ScreeningResult) => 
              sequenceIds.includes(screening.sequence.id)
            );
            
            if (hasNewResults) {
              onScreeningComplete();
              return true; // Stop polling
            }
          }
          
          if (attempts >= maxAttempts) {
            setMessage('Screening started but results are taking longer than expected. The table will update automatically when results are ready.');
            onScreeningComplete(); // Still update the table even if polling times out
            return true; // Stop polling
          }
          
          return false; // Continue polling
        };
        
        // Start polling
        const poll = async () => {
          const shouldStop = await pollForResults();
          if (!shouldStop) {
            setTimeout(poll, pollInterval);
          }
        };
        
        poll();
        
        // Don't close immediately, let the user see the status
        setTimeout(handleClose, 5000); // Close after 5 seconds
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

  const handleRemoveSequence = (index: number) => {
    setSequences(prev => prev.filter((_, i) => i !== index));
  };

  const hasInvalidSequences = sequences.some(seq => seq.seq.length < 50);

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Stack spacing={3} direction="column" alignItems="center">
          <Typography variant="h4">
            Upload and Screen Sequences
          </Typography>
          
          <Typography variant="body1" sx={{ textAlign: 'center' }}>
            Sequences must be at least 50 base pairs in length.
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
            <Button
              variant="outlined"
              onClick={() => setSequences([])}
              disabled={isProcessing}
            >
              Clear
            </Button>
          </Box>

          {sequences.length > 0 && (
            <>
              <Box sx={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Sequence</TableCell>
                      <TableCell>Length</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sequences.map((seq, index) => (
                      <TableRow key={index}>
                        <TableCell>{seq.name}</TableCell>
                        <TableCell>{seq.seq.substring(0, 50)}...</TableCell>
                        <TableCell sx={{ color: seq.seq.length < 50 ? 'error.main' : '' }}>{seq.seq.length} bp</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveSequence(index)}
                            disabled={isProcessing}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleScreening}
                  disabled={isProcessing || sequences.length === 0 || hasInvalidSequences}
                >
                  {isProcessing ? 'Processing...' : 'Screen Sequences'}
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