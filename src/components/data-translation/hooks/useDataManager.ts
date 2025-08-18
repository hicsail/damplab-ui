import { useState } from 'react';
import { GridRowModesModel, GridRowModel, GridColDef } from '@mui/x-data-grid';
import { FileData, AlertState } from '../types';

export const useDataManager = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const handleColumnDelete = (
    fieldToDelete: string,
    setAlert: (alert: AlertState) => void
  ): void => {
    if (!fileData) return;

    const updatedColumns = fileData.columns.filter(col => col.field !== fieldToDelete);
    const updatedRows = fileData.rows.map(row => {
      const newRow = { ...row };
      delete newRow[fieldToDelete];
      return newRow;
    });

    setFileData({
      ...fileData,
      columns: updatedColumns,
      rows: updatedRows
    });

    setAlert({
      open: true,
      message: 'Column deleted successfully.',
      severity: 'success'
    });
  };

  const handleColumnRename = (field: string, newHeaderName: string): void => {
    if (!fileData) return;

    const updatedColumns = fileData.columns.map(col => 
      col.field === field ? { ...col, headerName: newHeaderName } : col
    );

    setFileData({
      ...fileData,
      columns: updatedColumns
    });
  };

  const handleColumnReorder = (
    field: string, 
    direction: 'left' | 'right',
    setAlert: (alert: AlertState) => void
  ): void => {
    if (!fileData) return;

    const currentIndex = fileData.columns.findIndex(col => col.field === field);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= fileData.columns.length) return;

    const updatedColumns = [...fileData.columns];
    const [movedColumn] = updatedColumns.splice(currentIndex, 1);
    updatedColumns.splice(newIndex, 0, movedColumn);

    setFileData({
      ...fileData,
      columns: updatedColumns
    });

    setAlert({
      open: true,
      message: `Column "${movedColumn.headerName}" moved ${direction}.`,
      severity: 'success'
    });
  };

  const handleColumnManagerReorder = (fromIndex: number, toIndex: number): void => {
    if (!fileData || fromIndex === toIndex) return;

    const updatedColumns = [...fileData.columns];
    const [movedColumn] = updatedColumns.splice(fromIndex, 1);
    updatedColumns.splice(toIndex, 0, movedColumn);

    setFileData({
      ...fileData,
      columns: updatedColumns
    });
  };

  const handleAddNewColumn = (
    columnName: string,
    defaultValue: string,
    setAlert: (alert: AlertState) => void
  ): void => {
    if (!fileData || !columnName.trim()) return;

    const newField = `col_${Date.now()}`;
    const newColumn: GridColDef = {
      field: newField,
      headerName: columnName.trim(),
      width: 200,
      minWidth: 220,
      editable: true,
      type: 'string',
      sortable: true,
      resizable: true
    };

    // Add the column to the columns array
    const updatedColumns = [...fileData.columns, newColumn];

    // Add the default value to all existing rows
    const updatedRows = fileData.rows.map(row => ({
      ...row,
      [newField]: defaultValue.trim() || ''
    }));

    setFileData({
      ...fileData,
      columns: updatedColumns,
      rows: updatedRows
    });

    setAlert({
      open: true,
      message: `Column "${columnName}" added successfully!`,
      severity: 'success'
    });
  };

  const processRowUpdate = (newRow: GridRowModel): GridRowModel => {
    if (!fileData) return newRow;

    const updatedRows = fileData.rows.map(row => 
      row.id === newRow.id ? newRow : row
    );

    setFileData({
      ...fileData,
      rows: updatedRows
    });

    return newRow;
  };

  return {
    fileData,
    setFileData,
    rowModesModel,
    setRowModesModel,
    handleColumnDelete,
    handleColumnRename,
    handleColumnReorder,
    handleColumnManagerReorder,
    handleAddNewColumn,
    processRowUpdate
  };
};
