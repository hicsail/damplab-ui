import { Fragment, useMemo, useState } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  ScreeningBatch,
  ScreeningBatchSequenceSlice,
  SecureDnaHazardHit,
  HitRegion,
} from '../mpi/types';
import { ApolloError } from '@apollo/client';
import SequenceSeqVizModal from './SequenceSeqVizModal';

interface ScreeningBatchRow {
  id: string;
  providerReference: string | null;
  mpiBatchId: string;
  created_at: Date;
  region: ScreeningBatch['region'];
  sequenceCount: number;
  batchStatus: 'granted' | 'denied';
  batch: ScreeningBatch;
}

interface BatchGridRow extends ScreeningBatchRow {
  onViewDetails: () => void;
}

interface SecureDNAScreeningTableProps {
  screenings?: ScreeningBatch[];
  loading?: boolean;
  error?: ApolloError;
}

function batchToRow(batch: ScreeningBatch): ScreeningBatchRow {
  return {
    id: batch.id,
    providerReference: batch.providerReference?.trim() || null,
    mpiBatchId: batch.mpiBatchId,
    created_at: new Date(batch.created_at),
    region: batch.region,
    sequenceCount: batch.sequences.length,
    batchStatus: batch.synthesisPermission,
    batch,
  };
}

function sortBatches(rows: ScreeningBatchRow[]): ScreeningBatchRow[] {
  return [...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
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

function ThreatPanels({ threats }: { threats: SecureDnaHazardHit[] }) {
  if (threats.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No threats recorded for this sequence.
      </Typography>
    );
  }
  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      {threats.map((threat, threatIndex) => (
        <Box
          key={threatIndex}
          sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip label="THREAT" color="error" size="small" />
              <Chip
                label={String(threat.type ?? '').toUpperCase()}
                color="info"
                size="small"
                variant="outlined"
              />
              {threat.is_wild_type !== null && (
                <Chip
                  label={threat.is_wild_type ? 'Wild Type' : 'Non-Wild Type'}
                  color={threat.is_wild_type ? 'warning' : 'secondary'}
                  size="small"
                />
              )}
            </Stack>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Most likely organism:
              </Typography>
              <Typography sx={{ pl: 2, wordBreak: 'break-word' }}>
                {threat.most_likely_organism?.name ?? '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Hit Regions:
              </Typography>
              <Stack spacing={1} sx={{ pl: 2 }}>
                {threat.hit_regions?.map((region: HitRegion, idx: number) => (
                  <Box key={idx}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      Range: {region.seq_range_start}-{region.seq_range_end}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word', fontFamily: 'monospace' }}
                    >
                      Sequence: {region.seq}
                    </Typography>
                  </Box>
                ))}
                {(!threat.hit_regions || threat.hit_regions.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    No hit regions available
                  </Typography>
                )}
              </Stack>
            </Box>

            {threat.organisms && threat.organisms.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Related organisms:
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  {threat.organisms.map((org, idx) => (
                    <Typography key={idx} variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {org.name}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

const columns: GridColDef<BatchGridRow>[] = [
  {
    field: 'providerReference',
    headerName: 'Batch',
    flex: 1.2,
    sortable: false,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => {
      const ref = params.row.providerReference;
      const mpiId = params.row.mpiBatchId;
      const display = ref || mpiId;
      if (!display) {
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
      const short = display.length > 40 ? `${display.slice(0, 38)}…` : display;
      return (
        <Tooltip title={display}>
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
            {short}
          </Typography>
        </Tooltip>
      );
    },
  },
  {
    field: 'sequenceCount',
    headerName: 'Sequences',
    flex: 0.55,
    type: 'number',
    align: 'left',
    headerAlign: 'left',
  },
  {
    field: 'batchStatus',
    headerName: 'Batch status',
    flex: 0.85,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => {
      const status = params.row.batchStatus.toUpperCase();
      const color =
        status === 'GRANTED' ? 'success.main' : 'error.main';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography color={color}>{status}</Typography>
        </Box>
      );
    },
  },
  {
    field: 'created_at',
    headerName: 'Created',
    flex: 1,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) =>
      new Date(params.row.created_at).toLocaleString(),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    flex: 0.85,
    sortable: false,
    renderCell: (params: GridRenderCellParams<BatchGridRow>) => (
      <Button
        variant="contained"
        size="small"
        onClick={() => params.row?.onViewDetails()}
        sx={{
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        View batch
      </Button>
    ),
  },
];

function sliceRowKey(batch: ScreeningBatch, slice: ScreeningBatchSequenceSlice): string {
  return `${batch.id}-${slice.mpiSequenceId}-${slice.order}`;
}

export default function SecureDNAScreeningTable({
  screenings = [],
  loading = false,
  error,
}: SecureDNAScreeningTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<ScreeningBatchRow | null>(
    null
  );
  const [expandedSeqKey, setExpandedSeqKey] = useState<string | null>(null);
  const [seqVizTarget, setSeqVizTarget] = useState<{
    name: string;
    sequence: Pick<
      ScreeningBatchSequenceSlice['sequence'],
      'seq' | 'type' | 'annotations'
    >;
  } | null>(null);

  const batches = useMemo(
    () => sortBatches(screenings.map(batchToRow)),
    [screenings]
  );

  const rows: BatchGridRow[] = useMemo(
    () =>
      batches.map((b) => ({
        ...b,
        onViewDetails: () => setSelectedBatch(b),
      })),
    [batches]
  );

  if (loading) return <div>Loading...</div>;
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('no authorization header')) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Please sign in to DAMPLab to view SecureDNA screening results
          </Typography>
        </Box>
      );
    }
    return <div>Error: {error.message}</div>;
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
        autoHeight
        sx={{
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f5f5f5',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid rgba(224, 224, 224, 1)',
            marginTop: 0,
          },
          '& .MuiDataGrid-virtualScroller': {
            overflow: 'hidden',
          },
        }}
      />
      {selectedBatch && (
        <Modal
          open
          onClose={() => {
            setSelectedBatch(null);
            setExpandedSeqKey(null);
            setSeqVizTarget(null);
          }}
        >
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

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    MPI batch id
                  </Typography>
                  <Typography sx={{ pl: 1, wordBreak: 'break-word' }}>
                    {selectedBatch.batch.mpiBatchId}
                  </Typography>
                </Box>
                {selectedBatch.providerReference ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Provider reference
                    </Typography>
                    <Typography sx={{ pl: 1, wordBreak: 'break-word' }}>
                      {selectedBatch.providerReference}
                    </Typography>
                  </Box>
                ) : null}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Region
                  </Typography>
                  <Typography sx={{ pl: 1 }}>
                    {String(selectedBatch.region).toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Screened (MPI)
                  </Typography>
                  <Typography sx={{ pl: 1 }}>
                    {new Date(selectedBatch.batch.mpiCreatedAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Stored
                  </Typography>
                  <Typography sx={{ pl: 1 }}>
                    {new Date(selectedBatch.created_at).toLocaleString()}
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
                        selectedBatch.batchStatus === 'granted'
                          ? 'success.main'
                          : 'error.main',
                    }}
                  >
                    {selectedBatch.batchStatus.toUpperCase()}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Sequences in this batch ({selectedBatch.batch.sequences.length})
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
                  {selectedBatch.batch.sequences.map((slice) => {
                    const rowKey = sliceRowKey(selectedBatch.batch, slice);
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
                                      name: slice.sequence.name,
                                      sequence: {
                                        seq: slice.sequence.seq,
                                        type: slice.sequence.type,
                                        annotations: slice.sequence.annotations,
                                      },
                                    })
                                  }
                                  disabled={!slice.sequence?.seq}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              color={
                                selectedBatch.batch.synthesisPermission === 'granted'
                                  ? 'success.main'
                                  : 'error.main'
                              }
                              fontWeight="medium"
                            >
                              {selectedBatch.batch.synthesisPermission.toUpperCase()}
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
                                <ThreatPanels threats={slice.threats} />
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

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
                flexWrap: 'wrap',
                mt: 1,
              }}
            >
              <Button variant="outlined" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => downloadIbbisSummaryCsv(selectedBatch.batch)}
              >
                Download IBBIS Summary
              </Button>
            </Box>
          </Box>
        </Modal>
      )}

      {seqVizTarget && (
        <SequenceSeqVizModal
          open
          onClose={() => setSeqVizTarget(null)}
          name={seqVizTarget.name}
          sequence={seqVizTarget.sequence}
        />
      )}
    </Box>
  );
}
