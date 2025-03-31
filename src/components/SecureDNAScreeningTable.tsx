import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  Typography,
  Button,
  Modal,
  Box,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton
} from '@mui/material';
import { useState, ChangeEvent, useEffect } from 'react';
import SeqViz from 'seqviz';
import { ScreeningResult, HazardHits } from '../mpi/types';
import { useApolloClient, useQuery } from '@apollo/client';
import { subscribeToScreeningResults } from '../mpi/Subscriptions';
import { GET_USER_SCREENINGS } from '../mpi/Queries';

interface SecureDNAScreeningTableProps {
  onScreeningUpdate?: (result: ScreeningResult) => void;
}

const applyPagination = (
  screenings: ScreeningResult[],
  page: number,
  limit: number
): ScreeningResult[] => {
  if (screenings) {
    return screenings.slice(page * limit, page * limit + limit);
  } else {
    return [];
  }
};

function SecureDNAScreeningTable({ onScreeningUpdate }: SecureDNAScreeningTableProps) {
  const [selectedScreening, setSelectedScreening] = useState<ScreeningResult | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const client = useApolloClient();

  const { data, loading, refetch } = useQuery(GET_USER_SCREENINGS);

  useEffect(() => {
    const subscription = subscribeToScreeningResults(client, (result: ScreeningResult) => {
      refetch();
      onScreeningUpdate?.(result);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [client, refetch, onScreeningUpdate]);

  const handleOpen = (screening: ScreeningResult) => {
    setSelectedScreening(screening);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedScreening(null);
  };

  const getFormattedDate = (dateString: string | Date) => {
    const datetime = new Date(dateString).toLocaleString('en-US', { timeZoneName: 'short' });
    return datetime;
  };

  const handlePageChange = (event: any, newPage: number): void => {
    setPage(newPage);
  };

  const handleLimitChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setLimit(parseInt(event.target.value));
  };

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
    overflowY: 'scroll'
  };

  const renderTable = () => {
    if (loading) {
      return <Typography>Loading...</Typography>;
    }

    const screenings = data?.getUserScreenings || [];

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sequence</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {screenings.map((screening: ScreeningResult) => (
              <TableRow key={screening.id}>
                <TableCell>{screening.sequence.name}</TableCell>
                <TableCell>{screening.region}</TableCell>
                <TableCell>
                  <Typography
                    color={
                      screening.status === 'completed'
                        ? 'success.main'
                        : screening.status === 'failed'
                        ? 'error.main'
                        : 'warning.main'
                    }
                  >
                    {screening.status.toUpperCase()}
                  </Typography>
                </TableCell>
                <TableCell>{new Date(screening.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(screening)}>
                    <Button variant="outlined" size="small">
                      View Details
                    </Button>
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const paginatedScreenings = applyPagination(data?.getUserScreenings || [], page, limit);

  const getAnnotations = () => {
    if (!selectedScreening) return [];
    return selectedScreening.threats.map((threat, idx) => ({
      start: 0,
      end: 0,
      id: `${threat.name}-${idx}`,
      color: 'red',
      name: threat.name
    }));
  };

  return (
    <Box>
      {renderTable()}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Screening Details</DialogTitle>
        <DialogContent>
          {selectedScreening && (
            <Box>
              <Typography variant="h6">Sequence</Typography>
              <Typography>{selectedScreening.sequence.name}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>Status</Typography>
              <Typography>{selectedScreening.status.toUpperCase()}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>Region</Typography>
              <Typography>{selectedScreening.region}</Typography>
              {selectedScreening.threats && selectedScreening.threats.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>Threats Detected</Typography>
                  {selectedScreening.threats.map((threat: HazardHits, index: number) => (
                    <Box key={index} sx={{ mt: 1 }}>
                      <Typography variant="subtitle1">{threat.name}</Typography>
                      <Typography variant="body2">Description: {threat.description}</Typography>
                      <Typography variant="body2">Wild Type: {threat.is_wild_type ? 'Yes' : 'No'}</Typography>
                      {threat.references.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          References: {threat.references.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Card sx={{ maxWidth: '90%' }}>
        <Box p={2}>
          <TablePagination
            component="div"
            count={data?.getUserScreenings?.length || 0}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleLimitChange}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[5, 10, 25, 30]}
          />
        </Box>
      </Card>
    </Box>
  );
}

export default SecureDNAScreeningTable;
