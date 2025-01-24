import { FC, ChangeEvent, useState } from 'react';
import {
  Box,
  Card,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableContainer,
  Paper,
  Tooltip,
  Button,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Sequence } from '../mpi/models/sequence';
import SequenceViewer from './SequenceViewer';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ScreenSequencesConfirmation from './ScreenSequencesConfirmation';

interface SequencesTableProps {
  sequences: Sequence[];
  onNewSequence: () => void;
  onRefresh: () => void;
}

const applyPagination = (
  sequences: Sequence[],
  page: number,
  limit: number
): Sequence[] => {
  return sequences.slice(page * limit, page * limit + limit);
};

const SequencesTable: FC<SequencesTableProps> = ({ sequences, onNewSequence, onRefresh }) => {
  const [selectedSequences, setSelectedSequences] = useState<Sequence[]>([]);
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [viewingSequence, setViewingSequence] = useState<Sequence | null>(null);
  const [openScreeningConfirmation, setOpenScreeningConfirmation] = useState(false);

  const handleSelectAllSequences = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setSelectedSequences(
      event.target.checked ? sequences : []
    );
  };

  const handleSelectOneSequence = (
    event: ChangeEvent<HTMLInputElement>,
    sequenceId: string
  ): void => {
    if (!sequenceId) return;
    
    const foundSequence = sequences.find((seq) => seq.id === sequenceId);
    if (!foundSequence) return;

    const alreadySelected = selectedSequences.some((seq) => seq.id === sequenceId);
    if (!alreadySelected) {
      setSelectedSequences([...selectedSequences, foundSequence]);
    } else {
      setSelectedSequences(selectedSequences.filter((seq) => seq.id !== sequenceId));
    }
  };

  const handlePageChange = (event: any, newPage: number): void => {
    setPage(newPage);
  };

  const handleLimitChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setLimit(parseInt(event.target.value));
  };

  const paginatedSequences = applyPagination(sequences, page, limit);
  const selectedSomeSequences = selectedSequences.length > 0 && selectedSequences.length < sequences.length;
  const selectedAllSequences = selectedSequences.length === sequences.length;

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between', maxWidth: '90%' }}>
        <Box sx={{ display: 'flex', mr: 3 }}>
          <Button variant='outlined' sx={{ display: 'flex', mr: 3 }} onClick={onRefresh}>
            <RefreshIcon fontSize='small' />
          </Button>
          <Button
            variant="contained"
            onClick={onNewSequence}
            startIcon={<AddIcon fontSize="small" />}
          >
            New sequence
          </Button>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenScreeningConfirmation(true)}
          disabled={selectedSequences.length === 0}
        >
          Screen {selectedSequences.length || 'No'} Sequence{selectedSequences.length === 1 ? '' : 's'}
        </Button>
      </Box>
      
      <TableContainer sx={{ maxWidth: '90%', textAlign: 'left' }} component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  checked={selectedAllSequences}
                  indeterminate={selectedSomeSequences}
                  onChange={handleSelectAllSequences}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Sequence</TableCell>
              <TableCell>Job ID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSequences.map((sequence) => {
              const isSelected = selectedSequences.some((seq) => seq.id === sequence.id);
              return (
                <TableRow
                  hover
                  key={sequence.id}
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isSelected}
                      onChange={(event) => handleSelectOneSequence(event, sequence.id!)}
                    />
                  </TableCell>
                  <TableCell>{sequence.name}</TableCell>
                  <TableCell>{sequence.id}</TableCell>
                  <TableCell>{sequence.type}</TableCell>
                  <TableCell>
                    {sequence.seq?.substring(0, 50)}
                    {sequence.seq?.length > 50 ? '...' : ''}
                  </TableCell>
                  <TableCell>{/* Empty for now */}</TableCell>
                  <TableCell>
                    <Tooltip title="View sequence">
                      <IconButton 
                        size="small"
                        onClick={() => setViewingSequence(sequence)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Card sx={{ maxWidth: '90%' }}>
        <Box p={2}>
          <TablePagination
            component="div"
            count={sequences.length}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleLimitChange}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[5, 10, 25, 30]}
          />
        </Box>
      </Card>

      {viewingSequence && (
        <SequenceViewer
          open={Boolean(viewingSequence)}
          onClose={() => setViewingSequence(null)}
          sequence={viewingSequence}
        />
      )}

      <ScreenSequencesConfirmation
        open={openScreeningConfirmation}
        onClose={() => setOpenScreeningConfirmation(false)}
        sequences={selectedSequences}
      />
    </>
  );
};

export default SequencesTable; 