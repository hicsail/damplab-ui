import { GridColDef, GridRowsProp } from '@mui/x-data-grid';

export interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface FileData {
  fileName: string;
  columns: GridColDef[];
  rows: GridRowsProp;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  columnMapping: {
    field: string;
    headerName: string;
    type: string;
    width: number;
    order: number;
  }[];
}

export type DataType = 'number' | 'date' | 'string';

export interface ColumnManagerState {
  newColumnName: string;
  newColumnDefaultValue: string;
  draggedIndex: number | null;
}

export interface CopyDialogState {
  open: boolean;
  data: string;
  includesHeaders: boolean;
}

export interface TemplateDialogState {
  loadDialog: boolean;
  saveDialog: boolean;
  name: string;
  description: string;
}
