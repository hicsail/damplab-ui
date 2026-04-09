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
import { ScreeningResult, HitRegion } from '../mpi/types';
import { ApolloError } from '@apollo/client';
import SequenceSeqVizModal from './SequenceSeqVizModal';

interface ScreeningBatchRow {
  id: string;
  providerReference: string | null;
  created_at: Date;
  region: ScreeningResult['region'];
  sequenceCount: number;
  batchStatus: 'granted' | 'denied' | 'mixed';
  items: ScreeningResult[];
}

interface BatchGridRow extends ScreeningBatchRow {
  onViewDetails: () => void;
}

interface SecureDNAScreeningTableProps {
  screenings?: ScreeningResult[];
  loading?: boolean;
  error?: ApolloError;
}

function batchKey(s: ScreeningResult): string {
  const ref = s.providerReference?.trim();
  if (ref) return `ref:${ref}`;
  return `single:${s.id}`;
}

function clusterScreenings(screenings: ScreeningResult[]): ScreeningBatchRow[] {
  const map = new Map<string, ScreeningResult[]>();
  for (const s of screenings) {
    const k = batchKey(s);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }

  const batches: ScreeningBatchRow[] = [];
  for (const [, items] of map) {
    items.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const first = items[0];
    const ref = first.providerReference?.trim() || null;
    const denied = items.some((x) => x.status === 'denied');
    const granted = items.some((x) => x.status === 'granted');
    let batchStatus: 'granted' | 'denied' | 'mixed' = 'granted';
    if (denied && granted) batchStatus = 'mixed';
    else if (denied) batchStatus = 'denied';
    else batchStatus = 'granted';

    const maxCreated = new Date(
      Math.max(...items.map((x) => new Date(x.created_at).getTime()))
    );

    batches.push({
      id: ref ? `ref:${ref}` : `single:${first.id}`,
      providerReference: ref,
      created_at: maxCreated,
      region: first.region,
      sequenceCount: items.length,
      batchStatus,
      items,
    });
  }

  batches.sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  );
  return batches;
}

function ThreatPanels({ threats }: { threats: ScreeningResult['threats'] }) {
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
                Name:
              </Typography>
              <Typography sx={{ pl: 2, wordBreak: 'break-word' }}>
                {threat.name}
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

            {threat.references.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Related Organisms:
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  {threat.references.map((org, idx) => (
                    <Typography key={idx} variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {org}
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
      if (!ref) {
        return (
          <Typography variant="body2" color="text.secondary">
            Single sequence
          </Typography>
        );
      }
      const short = ref.length > 40 ? `${ref.slice(0, 38)}…` : ref;
      return (
        <Tooltip title={ref}>
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
        status === 'GRANTED'
          ? 'success.main'
          : status === 'DENIED'
            ? 'error.main'
            : 'warning.main';
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

export default function SecureDNAScreeningTable({
  screenings = [],
  loading = false,
  error,
}: SecureDNAScreeningTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<ScreeningBatchRow | null>(
    null
  );
  const [expandedSeqId, setExpandedSeqId] = useState<string | null>(null);
  const [seqVizTarget, setSeqVizTarget] = useState<{
    name: string;
    sequence: Pick<
      ScreeningResult['sequence'],
      'seq' | 'type' | 'annotations'
    >;
  } | null>(null);

  const batches = useMemo(
    () => clusterScreenings(screenings),
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
            setExpandedSeqId(null);
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
                {selectedBatch.providerReference ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Batch id
                    </Typography>
                    <Typography sx={{ pl: 1, wordBreak: 'break-word' }}>
                      {selectedBatch.providerReference}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No batch id (legacy single-sequence row)
                  </Typography>
                )}
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
                    Created
                  </Typography>
                  <Typography sx={{ pl: 1 }}>
                    {new Date(selectedBatch.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Batch status
                  </Typography>
                  <Typography
                    sx={{
                      pl: 1,
                      fontWeight: 'bold',
                      color:
                        selectedBatch.batchStatus === 'granted'
                          ? 'success.main'
                          : selectedBatch.batchStatus === 'denied'
                            ? 'error.main'
                            : 'warning.main',
                    }}
                  >
                    {selectedBatch.batchStatus.toUpperCase()}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Sequences in this batch ({selectedBatch.items.length})
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
                    <TableCell>Status</TableCell>
                    <TableCell>Hazardous</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedBatch.items.map((row) => {
                    const open = expandedSeqId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <TableRow hover>
                          <TableCell padding="checkbox">
                            <IconButton
                              size="small"
                              aria-expanded={open}
                              aria-label="show threat details"
                              onClick={() =>
                                setExpandedSeqId(open ? null : row.id)
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
                              {row.sequence?.name ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" padding="checkbox">
                            <Tooltip title="View sequence map">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label="View sequence map"
                                  onClick={() =>
                                    setSeqVizTarget({
                                      name: row.sequence.name,
                                      sequence: {
                                        seq: row.sequence.seq,
                                        type: row.sequence.type,
                                        annotations: row.sequence.annotations,
                                      },
                                    })
                                  }
                                  disabled={!row.sequence?.seq}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography
                              color={
                                row.status === 'granted'
                                  ? 'success.main'
                                  : 'error.main'
                              }
                              fontWeight="medium"
                            >
                              {row.status.toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.threats.length > 0 ? 'Yes' : 'No'}
                              color={row.threats.length > 0 ? 'warning' : 'default'}
                              size="small"
                              variant={row.threats.length > 0 ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow key={`${row.id}-detail`}>
                          <TableCell
                            style={{ paddingBottom: 0, paddingTop: 0 }}
                            colSpan={5}
                          >
                            <Collapse in={open} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Threat details
                                </Typography>
                                <ThreatPanels threats={row.threats} />
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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button variant="outlined" onClick={() => setSelectedBatch(null)}>
                Close
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
