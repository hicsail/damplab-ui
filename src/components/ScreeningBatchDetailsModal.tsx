import { Fragment, useState } from 'react';
import {
  Button,
  Typography,
  Box,
  Modal,
  Stack,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SecureDnaThreatPanels } from './SecureDnaThreatPanels';
import SequenceSeqVizModal from './SequenceSeqVizModal';
import type { ScreeningBatch, ScreeningBatchSequenceSlice } from '../securedna/types';

function sliceRowKey(batch: ScreeningBatch, slice: ScreeningBatchSequenceSlice): string {
  return `${batch.id}-${slice.recordId}-${slice.order}`;
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadIbbisSummaryCsv(batch: ScreeningBatch) {
  const header = ['UUID', 'Flag'].map(escapeCsvCell).join(',');
  const lines = batch.sequences.map((slice) => {
    const uuid = slice.sequence?.name ?? slice.name ?? '';
    const flag = slice.threats.length > 0 ? 1 : 0;
    return [uuid, flag].map((c) => escapeCsvCell(c)).join(',');
  });
  const csvContent = [header, ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'ibbis-summary.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface ScreeningBatchDetailsModalProps {
  open: boolean;
  batch: ScreeningBatch | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

export default function ScreeningBatchDetailsModal({
  open,
  batch,
  loading = false,
  error,
  onClose,
}: ScreeningBatchDetailsModalProps) {
  const [expandedSeqKey, setExpandedSeqKey] = useState<string | null>(null);
  const [seqVizTarget, setSeqVizTarget] = useState<{
    name: string;
    sequence: Pick<
      ScreeningBatchSequenceSlice['sequence'],
      'seq' | 'type' | 'annotations'
    >;
  } | null>(null);

  const handleClose = () => {
    setExpandedSeqKey(null);
    setSeqVizTarget(null);
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95vw', sm: 880 },
            maxWidth: 900,
            bgcolor: 'background.paper',
            border: '1px solid #000',
            boxShadow: 24,
            p: 3,
            borderRadius: '16px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
        >
          <Typography variant="h5" sx={{ mb: 2 }}>
            Batch details
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : !batch ? (
            <Typography color="text.secondary">No screening batch found.</Typography>
          ) : (
            <>
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Batch run id
                    </Typography>
                    <Typography sx={{ pl: 1, wordBreak: 'break-word' }}>
                      {batch.batchRunId}
                    </Typography>
                  </Box>
                  {batch.providerReference?.trim() ? (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Provider reference
                      </Typography>
                      <Typography sx={{ pl: 1, wordBreak: 'break-word' }}>
                        {batch.providerReference}
                      </Typography>
                    </Box>
                  ) : null}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Region
                    </Typography>
                    <Typography sx={{ pl: 1 }}>
                      {String(batch.region).toUpperCase()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Screening completed
                    </Typography>
                    <Typography sx={{ pl: 1 }}>
                      {new Date(batch.screeningCompletedAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Stored
                    </Typography>
                    <Typography sx={{ pl: 1 }}>
                      {new Date(batch.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Batch synthesis permission
                    </Typography>
                    <Typography
                      sx={{
                        pl: 1,
                        fontWeight: 'bold',
                        color:
                          batch.synthesisPermission === 'granted'
                            ? 'success.main'
                            : 'error.main',
                      }}
                    >
                      {batch.synthesisPermission.toUpperCase()}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Sequences in this batch ({batch.sequences.length})
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={48} />
                      <TableCell>Sequence</TableCell>
                      <TableCell align="center" width={56} padding="checkbox">
                        View
                      </TableCell>
                      <TableCell align="center">Batch permission</TableCell>
                      <TableCell>Hazardous</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batch.sequences.map((slice) => {
                      const rowKey = sliceRowKey(batch, slice);
                      const open = expandedSeqKey === rowKey;
                      return (
                        <Fragment key={rowKey}>
                          <TableRow hover>
                            <TableCell padding="checkbox">
                              <IconButton
                                size="small"
                                aria-expanded={open}
                                aria-label="show threat details"
                                onClick={() =>
                                  setExpandedSeqKey(open ? null : rowKey)
                                }
                                sx={{
                                  transform: open ? 'rotate(180deg)' : 'none',
                                  transition: (theme) =>
                                    theme.transitions.create('transform', {
                                      duration: theme.transitions.duration.shortest,
                                    }),
                                }}
                              >
                                <ExpandMoreIcon />
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                {slice.sequence?.name ?? slice.name ?? '—'}
                              </Typography>
                              {slice.warning ? (
                                <Typography variant="caption" color="warning.main" display="block">
                                  {slice.warning}
                                </Typography>
                              ) : null}
                            </TableCell>
                            <TableCell align="center" padding="checkbox">
                              <Tooltip title="View sequence map">
                                <span>
                                  <IconButton
                                    size="small"
                                    aria-label="View sequence map"
                                    onClick={() =>
                                      setSeqVizTarget({
                                        name: slice.sequence?.name ?? slice.name,
                                        sequence: {
                                          seq: slice.sequence?.seq ?? slice.originalSeq,
                                          type: slice.sequence?.type ?? 'dna',
                                          annotations: slice.sequence?.annotations,
                                        },
                                      })
                                    }
                                    disabled={!(slice.sequence?.seq || slice.originalSeq)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                color={
                                  batch.synthesisPermission === 'granted'
                                    ? 'success.main'
                                    : 'error.main'
                                }
                                fontWeight="medium"
                              >
                                {batch.synthesisPermission.toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={slice.threats.length > 0 ? 'Yes' : 'No'}
                                color={slice.threats.length > 0 ? 'warning' : 'default'}
                                size="small"
                                variant={slice.threats.length > 0 ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${rowKey}-detail`}>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={5}
                            >
                              <Collapse in={open} timeout="auto" unmountOnExit>
                                <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Threat details
                                  </Typography>
                                  <SecureDnaThreatPanels threats={slice.threats} />
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
              flexWrap: 'wrap',
              mt: 1,
            }}
          >
            <Button variant="outlined" onClick={handleClose}>
              Close
            </Button>
            {batch && !loading && !error ? (
              <Button
                variant="contained"
                onClick={() => downloadIbbisSummaryCsv(batch)}
              >
                Download IBBIS Summary
              </Button>
            ) : null}
          </Box>
        </Box>
      </Modal>

      {seqVizTarget && (
        <SequenceSeqVizModal
          open
          onClose={() => setSeqVizTarget(null)}
          name={seqVizTarget.name}
          sequence={seqVizTarget.sequence}
        />
      )}
    </>
  );
}
