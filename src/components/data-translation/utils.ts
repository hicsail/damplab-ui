import { GridColDef, GridRowsProp } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { DataType, FileData, Template } from './types';

/**
 * Detects the data type of a given value
 */
export const detectDataType = (value: any): DataType => {
  if (value === null || value === undefined || value === '') return 'string';
  
  // Check if it's a number
  if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
    return 'number';
  }
  
  // Check if it's a date
  const dateValue = new Date(value);
  if (!isNaN(dateValue.getTime()) && typeof value === 'string' && value.match(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/)) {
    return 'date';
  }
  
  return 'string';
};

/**
 * Validates if a file type is supported
 */
export const validateFileType = (fileName: string): boolean => {
  return fileName.match(/\.(xlsx|xls|csv)$/i) !== null;
};

/**
 * Processes a CSV file and returns the data as a 2D array
 */
export const processCSVFile = async (file: File): Promise<any[][]> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => {
    // Simple CSV parsing - in production, consider using a proper CSV parser
    return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
  });
};

/**
 * Processes an Excel file and returns the data as a 2D array
 */
export const processExcelFile = async (file: File): Promise<any[][]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { 
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
};

/**
 * Analyzes column data types from sample values
 */
export const analyzeColumnTypes = (headers: any[], dataRows: any[][]): string[] => {
  return headers.map((_, colIndex) => {
    const sampleValues = dataRows.slice(0, 10).map(row => row[colIndex]).filter(val => val !== '' && val !== null && val !== undefined);
    if (sampleValues.length === 0) return 'string';
    
    const types = sampleValues.map(detectDataType);
    const typeCount = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Return the most common type
    return Object.entries(typeCount).sort(([,a], [,b]) => b - a)[0][0];
  });
};

/**
 * Creates columns definition from headers and types
 */
export const createColumnsFromHeaders = (headers: any[], columnTypes: string[]): GridColDef[] => {
  return headers.map((header, index) => ({
    field: `col_${index}`,
    headerName: String(header || `Column ${index + 1}`),
    width: columnTypes[index] === 'number' ? 220 : 260,
    minWidth: 220,
    editable: true,
    type: columnTypes[index] as 'string' | 'number' | 'date'
  }));
};

/**
 * Creates rows data with proper type conversion
 */
export const createRowsFromData = (headers: any[], dataRows: any[][], columnTypes: string[]): GridRowsProp => {
  return dataRows.map((row, rowIndex) => {
    const rowData: any = { id: rowIndex };
    headers.forEach((_, colIndex) => {
      let value = row[colIndex];
      
      // Convert based on detected type
      if (columnTypes[colIndex] === 'number' && value !== '' && value !== null && value !== undefined) {
        value = Number(value);
      } else if (columnTypes[colIndex] === 'date' && value !== '' && value !== null && value !== undefined) {
        value = new Date(value).toLocaleDateString();
      }
      
      rowData[`col_${colIndex}`] = value || '';
    });
    return rowData;
  });
};

/**
 * Generates copy data in TSV format
 */
export const generateCopyData = (fileData: FileData, includeHeaders: boolean): string => {
  // Create TSV (Tab-separated values) format for easy pasting into Excel/eLabs
  const dataLines = fileData.rows.map(row => 
    fileData.columns.map(col => String(row[col.field] || '')).join('\t')
  );
  
  if (includeHeaders) {
    const headers = fileData.columns.map(col => col.headerName).join('\t');
    return [headers, ...dataLines].join('\n');
  } else {
    return dataLines.join('\n');
  }
};

/**
 * Applies a template to file data
 */
export const applyTemplateToData = (fileData: FileData, template: Template): FileData => {
  // Create a mapping of original data to template columns, preserving order
  const templateColumns = template.columnMapping
    .sort((a, b) => a.order - b.order)
    .map(mapping => ({
      field: mapping.field,
      headerName: mapping.headerName,
      type: mapping.type as 'string' | 'number' | 'date',
      width: Math.max(mapping.width, 220), // Ensure minimum width for new controls
      minWidth: 220,
      editable: true,
      sortable: true,
      resizable: true
    }));

  // Filter rows to only include columns that exist in the template, maintaining order
  const templateFields = templateColumns.map(col => col.field);
  const filteredRows = fileData.rows.map(row => {
    const newRow: any = { id: row.id };
    templateFields.forEach(field => {
      if (row[field] !== undefined) {
        newRow[field] = row[field];
      } else {
        newRow[field] = '';
      }
    });
    return newRow;
  });

  return {
    ...fileData,
    columns: templateColumns,
    rows: filteredRows
  };
};

/**
 * Template storage utilities
 */
export const templateStorage = {
  key: 'abbott_data_templates',
  
  load: (): Template[] => {
    try {
      const templates = localStorage.getItem(templateStorage.key);
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  },
  
  save: (templates: Template[]): void => {
    localStorage.setItem(templateStorage.key, JSON.stringify(templates));
  },
  
  create: (name: string, description: string, fileData: FileData): Template => {
    return {
      id: `template_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      columnMapping: fileData.columns.map((col, index) => ({
        field: col.field,
        headerName: col.headerName || col.field,
        type: col.type || 'string',
        width: col.width || 150,
        order: index
      }))
    };
  }
};
