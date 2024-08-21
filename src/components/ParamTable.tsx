import React from 'react';
import { TextField, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

type RowData = {
  label: string;
  value: string | number; // Can be a string (for inputs) or a number (for quantities)
  isDropdown?: boolean;  // If true, this field will be a dropdown
  options?: string[];    // Dropdown options, only if `isDropdown` is true
};

type ParamTableProps = {
  title: string;
  rows: RowData[];
  onChange: (rows: RowData[]) => void;  // Callback to pass updated rows back to the parent component
};

const ParamTable: React.FC<ParamTableProps> = ({ title, rows, onChange }) => {

  const handleInputChange = (index: number, value: string | number) => {
    const updatedRows = [...rows];
    updatedRows[index].value = value;
    onChange(updatedRows);
  };

  return (
    <div>
      <Typography variant="h6">{title}</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Label</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.label}</TableCell>
              <TableCell>
                {row.isDropdown ? (
                  <Select
                    value={row.value}
                    onChange={(e) => handleInputChange(index, e.target.value as string)}
                    fullWidth
                  >
                    {row.options?.map((option, optIndex) => (
                      <MenuItem key={optIndex} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <TextField
                    type={typeof row.value === 'number' ? 'number' : 'text'}
                    value={row.value}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    fullWidth
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ParamTable;

