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
  Stack
} from '@mui/material';
import { useState, ChangeEvent } from 'react';
import SeqViz from 'seqviz';
import { ScreeningResult } from '../mpi/types';

interface ScreenerTableProps {
  className?: string;
  screenings: ScreeningResult[];
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

function SecureDnaTable({ screenings }: ScreenerTableProps) {
  const [screeningModal, setScreeningModal] = useState<ScreeningResult | null>(null);
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);

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

  const renderTable = (screeningData: ScreeningResult[]) => {
    return screeningData.map((screening: ScreeningResult, index: number) => (
      <TableRow key={index}>
        <TableCell>{getFormattedDate(screening.createdAt)}</TableCell>
        <TableCell>{screening.sequenceId}</TableCell>
        <TableCell>{screening.sequence.name}</TableCell>
        <TableCell>
          <Typography sx={{ textTransform: 'capitalize', color: screening.status === "denied" ? "red" : "green" }}>
            {screening.status}
          </Typography>
        </TableCell>
        <TableCell>
          <Button sx={{ ml: -1 }} onClick={() => setScreeningModal(screening)}>View</Button>
        </TableCell>
      </TableRow>
    ));
  };

  const paginatedScreenings = applyPagination(screenings, page, limit);

  const getAnnotations = () => {
    if (!screeningModal) return [];
    return screeningModal.threats.map((threat, idx) => 
      threat.hit_regions.map((region, regionIdx) => ({
        start: region.seq_range_start,
        end: region.seq_range_end,
        id: `${threat.most_likely_organism.name}-hit-region-${idx}-${regionIdx}`,
        color: 'red',
        name: threat.most_likely_organism.name
      }))
    ).flat();
  };

  return (
    <>
      {screeningModal &&
        <Modal
          open={screeningModal !== null}
          onClose={() => setScreeningModal(null)}
        >
          <Box sx={style}>
            <Stack direction="column" spacing={2}>
              <Typography variant="h6" component="h2">
                Sequence: {screeningModal.sequence.name}
              </Typography>
              <Typography variant="body1">
                Status: {screeningModal.status}
              </Typography>
              {screeningModal.status === 'denied' &&
                <>
                  <Typography variant="body1">
                    Threats Detected: {screeningModal.threats.map((threat) => threat.most_likely_organism.name).join(", ")}
                  </Typography>
                  <Typography variant="body1">
                    Hit Regions:
                  </Typography>
                  <SeqViz 
                    seq={screeningModal.originalSeq} 
                    viewer="linear" 
                    style={{ height: '200px' }} 
                    annotations={getAnnotations()} 
                  />
                </>
              }
            </Stack>
          </Box>
        </Modal>
      }

      <TableContainer sx={{ maxWidth: '90%', textAlign: 'left' }} component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Screening ID</TableCell>
              <TableCell>Sequence Name</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {renderTable(paginatedScreenings)}
          </TableBody>
        </Table>
      </TableContainer>
      <Card sx={{ maxWidth: '90%' }}>
        <Box p={2}>
          <TablePagination
            component="div"
            count={screenings?.length || 0}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleLimitChange}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[5, 10, 25, 30]}
          />
        </Box>
      </Card>
    </>
  );
}

export default SecureDnaTable;
