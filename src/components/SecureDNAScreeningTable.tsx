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
import { useEffect, useState, ChangeEvent } from 'react';
import SeqViz from 'seqviz';
import { updateSecureDNAScreening } from '../mpi/SecureDNAQueries';
import { Genome } from '../mpi/models/genome';

interface ScreenerTableProps {
  className?: string;
  genomes: Genome[];
}

const applyPagination = (
    genomes: Genome[],
    page: number,
    limit: number
  ): Genome[] => {
    if (genomes) {
      return genomes.slice(page * limit, page * limit + limit);
    } else {
      return [];
    }
};

function SecureDnaTable({ genomes }: ScreenerTableProps) {
  const [genomeModal, setGenomeModal] = useState<Genome | null>(null);
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);

  const getFormattedDate = (dateString: string) => {
      const date = new Date(dateString);
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      return `${month}/${day}/${year}`;
  };

  const getAdminStatusColor = (status: string) => {
      switch (status) {
          case 'approved':
              return 'green';
          case 'rejected':
              return 'red';
          case 'falsePositive':
              return 'orange';
      }
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

  const renderTable = (genomeData: Genome[]) => {
      return genomeData.map((genome: any, index: any) => (
          <TableRow key={index}>
              <TableCell>{getFormattedDate(genome.timestamp)}</TableCell>
              <TableCell>{genome.id}</TableCell>
              <TableCell>{genome.user.email}</TableCell>
              <TableCell>
                  <Typography sx={{ color: genome?.sequence?.biosecurity.status === "denied" ? "red" : "green" }}>
                      {genome?.sequence?.biosecurity.status}
                  </Typography>
              </TableCell>
              <TableCell>
                  <Typography sx={{ color: getAdminStatusColor(genome.adminStatus) }}>
                      {genome.adminStatus !== 'falsePositive' ? genome.adminStatus : 'false positive'}
                  </Typography>
              </TableCell>
              <TableCell>
                  <Button onClick={() => setGenomeModal(genome)}>View</Button>
              </TableCell>
          </TableRow>
      ));
  };

  const paginatedGenomes = applyPagination(genomes, page, limit);

  const getAnnotations = () => {
      const annotations = genomeModal?.sequence?.biosecurity?.biosecurityCheck?.map((check) => {
          return check.hit_regions.map((region, idx) => ({
              start: region.start_index,
              end: region.end_index,
              id: `${check.organism.name}-hit-region-${idx + 1}`,
              color: 'red',
              name: check.organism.name
          }));
      });
      return annotations?.flat();
  };

  const updateGenomeAdmin = async (status: string) => {
      const response = await updateSecureDNAScreening(genomeModal?.id, status);
      if (response) {
          setGenomeModal(null);
      }
  };

  return (
      <>
          {genomeModal &&
              <Modal
                  open={genomeModal !== null}
                  onClose={() => setGenomeModal(null)}
              >
                  <Box sx={style}>
                      <Stack direction="column" spacing={2}>
                          <Typography variant="h6" component="h2">
                              User email: {genomeModal.user.email}
                          </Typography>
                          <Typography variant="body1">
                              Sequence name: {genomeModal.sequence.name}
                          </Typography>
                          <Typography variant="body1">
                              Sequence type: {genomeModal.sequence.type}
                          </Typography>
                          <Typography variant="body1">
                              Sequence biosecurity status: {genomeModal?.sequence.biosecurity?.status}
                          </Typography>
                          {genomeModal?.sequence?.biosecurity?.status === 'denied' &&
                              <>
                                  <Typography variant="body1">
                                      Organisms Detected: {genomeModal?.sequence?.biosecurity?.biosecurityCheck?.map((check) => check.organism.name).join(", ")}
                                  </Typography>
                                  <Typography variant="body1">
                                      Hit Regions:
                                  </Typography>
                                  <SeqViz seq={genomeModal.sequence.seq} viewer="linear" style={{ height: '200px' }} annotations={getAnnotations()} />
                              </>
                          }
                          <Stack direction="row" spacing={2}>
                              <Button variant="contained" sx={{ width: '200px', backgroundColor: 'green' }} onClick={() => updateGenomeAdmin('approved')}>Approve Sequence</Button>
                              <Button variant="contained" sx={{ width: '200px', backgroundColor: 'red' }} onClick={() => updateGenomeAdmin('rejected')}>Reject Sequence</Button>
                              <Button variant="contained" sx={{ width: '200px', backgroundColor: 'orange' }} onClick={() => updateGenomeAdmin('falsePositive')}>Flag as False Positive</Button>
                          </Stack>
                      </Stack>
                  </Box>
              </Modal>
          }

          <TableContainer sx={{ maxWidth: '90%', textAlign: 'left' }} component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                      <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>ID</TableCell>
                          <TableCell>User Email</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Admin Status</TableCell>
                          <TableCell>Details</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      {renderTable(paginatedGenomes)}
                  </TableBody>
              </Table>
          </TableContainer>
          <Card sx={{ maxWidth: '90%' }}>
            <Box p={2}>
                <TablePagination
                    component="div"
                    count={genomes?.length || 0}
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
