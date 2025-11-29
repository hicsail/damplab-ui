import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Box, Button, Modal, Paper, IconButton } from '@mui/material';
import ParamTable from './ParamTable';
import CloseIcon from '@mui/icons-material/Close';

type ColumnData = {
  headerName: string;
  field: string;
};

type RowData = {
  [key: string]: string | number;
};

type DisplayTableProps = {
  title: string;
  columns: ColumnData[];
  rows: RowData[];
  onSave: (updatedRows: RowData[]) => void; // New prop to handle save action
};

const DisplayTable: React.FC<DisplayTableProps> = ({ title, columns, rows, onSave }) => {
  const [open, setOpen] = useState(false);
  const [tempRows, setTempRows] = useState<RowData[]>(rows); // Temporary state to manage edits

  const handleOpen = () => {
    setTempRows([...rows]); // Copy current rows to temporary state
    setOpen(true);
  };

  const handleClose = () => {
    setTempRows(rows); // Revert tempRows to original rows if closing without saving
    setOpen(false);
  };
  
  const handleSave = () => {
    onSave(tempRows); // Apply changes by saving them
    setOpen(false);
  };

  return (
    <Box sx={{ maxWidth: '600px', overflowX: 'auto' }}>
      <Typography variant="h6">{title}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col, colIndex) => (
              <TableCell key={colIndex}>{col.headerName || col.field}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex}>
                  {row[col.field]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant="contained" color="primary" onClick={handleOpen} sx={{ mt: 2 }}>
        Edit
      </Button>

      <Modal open={open} onClose={handleClose}>
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            maxHeight: '80%',
            overflowY: 'auto',
            p: 4,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Edit {title}</Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <ParamTable
            title={title}
            columns={columns}
            rows={tempRows} // Pass the temporary state
            onChange={setTempRows} // Update the temporary state
          />
          <Box display="flex" justifyContent="flex-end" mt={3}>
            <Button onClick={handleClose} sx={{ mr: 2 }}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save
            </Button>
          </Box>
        </Paper>
      </Modal>
    </Box>
  );
};

export default DisplayTable;
