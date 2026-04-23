import {
  Box,
  Button,
  IconButton,
  Modal,
  Stack,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { Sequence } from '../securedna/types';
import { Region } from '../securedna/types';
import {
  createSequencesBatch,
  screenSequencesBatch,
  MAX_SECUREDNA_SEQUENCE_BATCH
} from '../securedna/SequencesQueries';
import { formatApolloError } from '../securedna/apolloError';
import { mapSeqparseAnnotationsToSaved } from '../securedna/mapSeqparseAnnotations';
import { parseFile } from 'seqparse';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SequenceSeqVizModal from './SequenceSeqVizModal';

const SEQUENCE_FILE_RE = /\.(seq|gb|gbk|genbank|ape|fasta|fas|fa|dna)$/i;

function isSequenceFileName(name: string): boolean {
  return SEQUENCE_FILE_RE.test(name);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Parse supported sequence files into local Sequence rows (skips bad files). */
async function parseSequenceFiles(files: File[]): Promise<Sequence[]> {
  const allSequences: Sequence[] = [];
  for (const file of files) {
    if (!isSequenceFileName(file.name)) continue;
    try {
      const fileContent = await readFileAsText(file);
      const parsedSequences = await parseFile(fileContent);
      allSequences.push(
        ...parsedSequences.map((seq) => ({
          id: '',
          name: seq.name,
          type: seq.type,
          seq: seq.seq,
          annotations: mapSeqparseAnnotationsToSaved(seq.annotations),
          userId: '',
          created_at: new Date(),
          updated_at: new Date()
        }))
      );
    } catch {
      continue;
    }
  }
  return allSequences;
}

/* Chromium directory drag-and-drop (File System Access API shape) */
interface FsFileEntry {
  isFile: true;
  isDirectory: false;
  file(success: (f: File) => void, err?: (e: Error) => void): void;
}

interface FsDirectoryReader {
  readEntries(success: (entries: FsEntry[]) => void, err?: (e: Error) => void): void;
}

interface FsDirEntry {
  isFile: false;
  isDirectory: true;
  createReader(): FsDirectoryReader;
}

type FsEntry = FsFileEntry | FsDirEntry;

function getItemAsEntry(item: DataTransferItem): FsEntry | null {
  const w = item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null };
  const raw = w.webkitGetAsEntry?.();
  return raw ? (raw as unknown as FsEntry) : null;
}

async function readAllDirEntries(reader: FsDirectoryReader): Promise<FsEntry[]> {
  const acc: FsEntry[] = [];
  const readChunk = (): Promise<void> =>
    new Promise((resolve, reject) => {
      reader.readEntries(
        (chunk) => {
          if (chunk.length === 0) {
            resolve();
            return;
          }
          acc.push(...chunk);
          readChunk().then(resolve).catch(reject);
        },
        reject
      );
    });
  await readChunk();
  return acc;
}

async function collectFilesFromDirectoryEntry(dir: FsDirEntry): Promise<File[]> {
  const out: File[] = [];
  const reader = dir.createReader();
  const entries = await readAllDirEntries(reader);
  for (const child of entries) {
    if (child.isFile) {
      const file = await new Promise<File>((res, rej) => child.file(res, rej));
      if (isSequenceFileName(file.name)) out.push(file);
    } else if (child.isDirectory) {
      out.push(...(await collectFilesFromDirectoryEntry(child)));
    }
  }
  return out;
}

/** Files and/or folders from a drop (best effort; folder depth needs webkitGetAsEntry). */
async function collectFilesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = dt.items;
  const probe = items?.[0] as (DataTransferItem & { webkitGetAsEntry?: () => unknown }) | undefined;
  if (items?.length && typeof probe?.webkitGetAsEntry === 'function') {
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== 'file') continue;
      const entry = getItemAsEntry(item);
      if (entry?.isFile) {
        const f = await new Promise<File>((res, rej) => entry.file(res, rej));
        if (isSequenceFileName(f.name)) files.push(f);
      } else if (entry?.isDirectory) {
        files.push(...(await collectFilesFromDirectoryEntry(entry)));
      } else {
        const f = item.getAsFile();
        if (f && isSequenceFileName(f.name)) files.push(f);
      }
    }
    if (files.length > 0) return files;
  }
  return Array.from(dt.files).filter((f) => isSequenceFileName(f.name));
}

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
}

function UploadAndScreenSequences({ open, onClose }: UploadAndScreenSequencesProps) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  /** After a successful screen+save, block double-submit until the user changes the batch. */
  const [screeningCompleted, setScreeningCompleted] = useState<boolean>(false);
  const [seqVizTarget, setSeqVizTarget] = useState<Sequence | null>(null);
  const dragDepthRef = useRef(0);
  const client = useApolloClient();

  useEffect(() => {
    if (!open) {
      setSequences([]);
      setMessage('');
      setError(false);
      setIsProcessing(false);
      setScreeningCompleted(false);
      setIsDragOver(false);
      setSeqVizTarget(null);
      dragDepthRef.current = 0;
    }
  }, [open]);

  const handleClose = () => {
    setSequences([]);
    setMessage('');
    setError(false);
    setIsProcessing(false);
    setScreeningCompleted(false);
    setSeqVizTarget(null);
    setIsDragOver(false);
    dragDepthRef.current = 0;
    onClose();
  };

  const ingestParsedSequences = useCallback((allSequences: Sequence[], emptyLabel: string) => {
    if (allSequences.length > 0) {
      setSequences((prev) => [...prev, ...allSequences]);
      setScreeningCompleted(false);
      setMessage('');
      setError(false);
    } else {
      setError(true);
      setMessage(emptyLabel);
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const fileContent = await readFileAsText(file);
      const parsedSequences = await parseFile(fileContent);
      const formattedSequences: Sequence[] = parsedSequences.map((seq) => ({
        id: '',
        name: seq.name,
        type: seq.type,
        seq: seq.seq,
        annotations: mapSeqparseAnnotationsToSaved(seq.annotations),
        userId: '',
        created_at: new Date(),
        updated_at: new Date()
      }));
      setSequences((prev) => [...prev, ...formattedSequences]);
      setScreeningCompleted(false);
      setMessage('');
      setError(false);
    } catch {
      setError(true);
      setMessage('Error parsing sequences');
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = '';
    if (!files?.length) return;
    try {
      const allSequences = await parseSequenceFiles(Array.from(files));
      ingestParsedSequences(allSequences, 'No valid sequence files found in the folder');
    } catch {
      setError(true);
      setMessage('Error processing folder or sequences');
    }
  };

  const onDropZoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const onDropZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    }
  };

  const onDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) e.dataTransfer.dropEffect = 'copy';
  };

  const onDropZoneDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (isProcessing) return;
    try {
      const files = await collectFilesFromDataTransfer(e.dataTransfer);
      const allSequences = await parseSequenceFiles(files);
      ingestParsedSequences(allSequences, 'No supported sequence files in the drop (use .fasta, .gb, etc.).');
    } catch {
      setError(true);
      setMessage('Error processing dropped files');
    }
  };

  const handleScreening = async () => {
    if (sequences.length === 0) return;

    setIsProcessing(true);
    setScreeningCompleted(false);
    setError(false);
    setMessage('Screening…');

    try {
      const created = await createSequencesBatch(client, sequences);
      const sequenceIds = created.map((s) => s.id);
      if (sequenceIds.length !== sequences.length) {
        throw new Error('Unexpected response from sequence creation');
      }

      const firstName = sequences[0]?.name || 'batch';
      const safeLabel = firstName.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'batch';
      const providerReference = `${safeLabel}...-${new Date().toISOString()}`;

      await screenSequencesBatch(client, sequenceIds, Region.ALL, providerReference);

      setError(false);
      setMessage('Screening complete. The table should show your new results.');
      setScreeningCompleted(true);
    } catch (e) {
      setError(true);
      setMessage(formatApolloError(e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSequence = (index: number) => {
    setScreeningCompleted(false);
    setSequences((prev) => prev.filter((_, i) => i !== index));
  };

  const hasInvalidSequences = sequences.some((seq) => seq.seq.length < 50);
  const hasTooManySequences = sequences.length > MAX_SECUREDNA_SEQUENCE_BATCH;

  return (
    <>
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Stack spacing={3} direction="column" alignItems="center">
          <Typography variant="h4">Upload and Screen Sequences</Typography>

          <Typography variant="body1" sx={{ textAlign: 'center' }}>
            Sequences must be at least 50 base pairs in length. At most {MAX_SECUREDNA_SEQUENCE_BATCH} sequences per
            batch.
          </Typography>

          {hasTooManySequences && (
            <Typography color="error" sx={{ textAlign: 'center' }}>
              Too many sequences ({sequences.length}). Remove some or split into batches of {MAX_SECUREDNA_SEQUENCE_BATCH}{' '}
              or fewer.
            </Typography>
          )}

          <Box
            onDragEnter={onDropZoneDragEnter}
            onDragLeave={onDropZoneDragLeave}
            onDragOver={onDropZoneDragOver}
            onDrop={onDropZoneDrop}
            sx={{
              width: '100%',
              maxWidth: 720,
              border: '2px dashed',
              borderColor: isDragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              bgcolor: isDragOver ? 'action.hover' : 'transparent',
              transition: 'background-color 0.15s ease, border-color 0.15s ease'
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
              Drag and drop files/folder here, or use the buttons below. (Folder drops work best in Chrome or Edge.)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="file"
                accept=".seq,.gb,.gbk,.genbank,.ape,.fasta,.fas,.fa,.dna"
                onChange={handleFileChange}
                id="seqFilePicker"
                style={{ display: 'none' }}
              />
              <label htmlFor="seqFilePicker">
                <Button component="span" variant="contained" startIcon={<FileUploadIcon />} disabled={isProcessing}>
                  Upload File
                </Button>
              </label>

              <input
                type="file"
                {...{ webkitdirectory: 'true' }}
                multiple
                onChange={handleFolderUpload}
                id="seqFolderPicker"
                style={{ display: 'none' }}
              />
              <label htmlFor="seqFolderPicker">
                <Button component="span" variant="contained" startIcon={<FileUploadIcon />} disabled={isProcessing}>
                  Upload Folder
                </Button>
              </label>
              <Button
                variant="outlined"
                onClick={() => {
                  setSequences([]);
                  setScreeningCompleted(false);
                  setMessage('');
                  setError(false);
                }}
                disabled={isProcessing}
              >
                Clear
              </Button>
            </Box>
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
                      <TableCell align="center" width={56} padding="checkbox">
                        View
                      </TableCell>
                      <TableCell> </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sequences.map((seq, index) => (
                      <TableRow key={index}>
                        <TableCell>{seq.name}</TableCell>
                        <TableCell>{seq.seq.substring(0, 50)}...</TableCell>
                        <TableCell sx={{ color: seq.seq.length < 50 ? 'error.main' : '' }}>
                          {seq.seq.length} bp
                        </TableCell>
                        <TableCell align="center" padding="checkbox">
                          <Tooltip title="View sequence map">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="View sequence map"
                                onClick={() => setSeqVizTarget(seq)}
                                disabled={isProcessing || seq.seq.length === 0}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
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

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleScreening}
                  disabled={
                    isProcessing ||
                    sequences.length === 0 ||
                    hasInvalidSequences ||
                    hasTooManySequences ||
                    screeningCompleted
                  }
                >
                  {isProcessing ? 'Processing...' : 'Screen Sequences'}
                </Button>
              </Box>
            </>
          )}

          {message && (
            <Typography
              sx={{
                color: error ? 'error.main' : isProcessing ? 'text.primary' : 'success.main',
                textAlign: 'center',
                maxWidth: 640
              }}
            >
              {message}
            </Typography>
          )}

          <Button variant="outlined" onClick={handleClose}>
            Close
          </Button>
        </Stack>
      </Box>
    </Modal>

      {seqVizTarget && (
        <SequenceSeqVizModal
          open
          onClose={() => setSeqVizTarget(null)}
          name={seqVizTarget.name}
          sequence={seqVizTarget}
        />
      )}
    </>
  );
}

export default UploadAndScreenSequences;
