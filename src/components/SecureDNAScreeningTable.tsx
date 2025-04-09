import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Button, Typography, Box, Modal, Stack, Chip } from '@mui/material';
import { GET_USER_SCREENINGS } from '../mpi/SequencesQueries';
import { ScreeningResult, HitRegion } from '../mpi/types';

interface ScreeningRow extends ScreeningResult {
  id: string;
  onViewDetails: (screening: ScreeningResult) => void;
}

const columns: GridColDef<ScreeningRow>[] = [
  { 
    field: 'sequence', 
    headerName: 'Sequence', 
    flex: 1,
    renderCell: (params: GridRenderCellParams<ScreeningRow>) => {
      return params.row.sequence?.name || '';
    }
  },
  { 
    field: 'status', 
    headerName: 'Status', 
    flex: 1,
    renderCell: (params: GridRenderCellParams<ScreeningRow>) => {
      const status = params.row.status.toUpperCase();
      const color = status === 'GRANTED' ? 'success.main' : 'error.main';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography color={color}>{status}</Typography>
        </Box>
      );
    }
  },
  { 
    field: 'created_at', 
    headerName: 'Created', 
    flex: 1,
    renderCell: (params: GridRenderCellParams<ScreeningRow>) => {
      if (!params.row.created_at) return '';
      return new Date(params.row.created_at).toLocaleString();
    }
  },
  {
    field: 'actions',
    headerName: 'Actions',
    flex: 1,
    renderCell: (params: GridRenderCellParams<ScreeningRow>) => (
      <Button 
        variant="contained" 
        size="small"
        onClick={() => params.row?.onViewDetails(params.row)}
        sx={{ 
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#1565c0',
          }
        }}
      >
        View Details
      </Button>
    )
  }
];

export default function SecureDNAScreeningTable() {
  const [selectedScreening, setSelectedScreening] = useState<ScreeningResult | null>(null);
  const { loading, error, data } = useQuery<{ getUserScreenings: ScreeningResult[] }>(GET_USER_SCREENINGS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const rows: ScreeningRow[] = (data?.getUserScreenings || []).map((screening) => ({
    ...screening,
    id: screening.id,
    onViewDetails: (screening: ScreeningResult) => setSelectedScreening(screening)
  }));

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 5 }
          }
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
          }
        }}
      />
      {selectedScreening && (
        <Modal open={!!selectedScreening} onClose={() => setSelectedScreening(null)}>
          <Box sx={{
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
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Screening Details
            </Typography>
            <Stack spacing={3}>
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Sequence:
                    </Typography>
                    <Typography sx={{ pl: 2, wordBreak: 'break-word' }}>{selectedScreening.sequence.name}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Status:
                    </Typography>
                    <Typography 
                      sx={{ 
                        pl: 2, 
                        color: selectedScreening.status === 'granted' ? 'success.main' : 'error.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {selectedScreening.status.toUpperCase()}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Region:
                    </Typography>
                    <Typography sx={{ pl: 2 }}>{selectedScreening.region.toUpperCase()}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Created:
                    </Typography>
                    <Typography sx={{ pl: 2 }}>
                      {new Date(selectedScreening.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {selectedScreening.threats.map((threat, threatIndex) => (
                <Box key={threatIndex} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
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
                      <Typography sx={{ pl: 2, wordBreak: 'break-word' }}>{threat.name}</Typography>
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
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', fontFamily: 'monospace' }}>
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
          </Box>
        </Modal>
      )}
    </Box>
  );
}
