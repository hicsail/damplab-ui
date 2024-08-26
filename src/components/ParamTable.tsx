import React from 'react';
import { TextField, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Typography, Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

type ColumnData = {
  header: string;  // The column header
  field: string;   // The field name to match in row data
  isDropdown?: boolean;  // If true, this column will have a dropdown
  options?: string[];    // Options for the dropdown, only if `isDropdown` is true
};

type RowData = {
  [key: string]: string | number; // Allows dynamic fields in each row
};

type ParamTableProps = {
  title: string;
  columns: ColumnData[];
  rows: RowData[];
  onChange: (rows: RowData[]) => void;  // Callback to pass updated rows back to the parent component
};

const ParamTable: React.FC<ParamTableProps> = ({ title, rows, onChange, columns }) => {

  const handleInputChange = (rowIndex: number, field: string, value: string | number) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][field] = value;
    onChange(updatedRows);
  };

  const handleAddRow = () => {
    const newRow: RowData = columns.reduce((acc, col) => {
      acc[col.field] = ''; // Initialize new row with empty values
      return acc;
    }, {} as RowData);

    onChange([...rows, newRow]);
  };

  return (
    <Box>
    <div>
      <Typography variant="h6">{title}</Typography>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col, colIndex) => (
              <TableCell key={colIndex}>{col.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex}>
                  {col.isDropdown ? (
                    <Select
                      value={row[col.field]}
                      onChange={(e) => handleInputChange(rowIndex, col.field, e.target.value as string)}
                      fullWidth
                      sx={{ minWidth: '120px' }} // Minimum width for dropdowns
                    >
                      {col.options?.map((option, optIndex) => (
                        <MenuItem key={optIndex} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <TextField
                      type={typeof row[col.field] === 'number' ? 'number' : 'text'}
                      value={row[col.field]}
                      onChange={(e) => handleInputChange(rowIndex, col.field, e.target.value)}
                      multiline={typeof row[col.field] === 'string' && row[col.field].length > 20} // Enable multiline for longer text
                      fullWidth
                      InputProps={{
                        style: { minWidth: '120px' }, // Ensure a minimum width
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          width: 'auto', // Width adjusts based on content
                          flexWrap: 'wrap', // Allows wrapping for multiline text
                        },
                      }}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
        >
          Add Row
        </Button>
      </Box>

    </Box>
  );
};

export default ParamTable;

