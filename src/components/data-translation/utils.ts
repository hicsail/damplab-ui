import { GridColDef, GridRowsProp } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { DataType, FileData, Template } from './types';
import { DateFilterCriteria } from './DateFilter';
import { TimeFilterCriteria } from './TimeFilter';

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
  const templateColumns = [...template.columnMapping]
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

/**
 * Parse various date formats commonly found in Excel/CSV files
 */
export const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) return dateValue;
  
  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;
  
  // Common date formats to try
  const formats = [
    // MM.DD.YYYY (like 02.18.2025)
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ];
  
  // Try MM.DD.YYYY and MM/DD/YYYY first (common US formats)
  const mmddyyyy = dateStr.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1], 10);
    const day = parseInt(mmddyyyy[2], 10);
    const year = parseInt(mmddyyyy[3], 10);
    
    // Validate ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Try YYYY-MM-DD (ISO format)
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10);
    const day = parseInt(yyyymmdd[3], 10);
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(dateStr);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }
  
  return null;
};

/**
 * Get date columns from file data
 */
export const getDateColumns = (fileData: FileData): string[] => {
  return fileData.columns
    .filter(col => col.type === 'date' || col.headerName?.toLowerCase().includes('date'))
    .map(col => col.headerName || col.field);
};

/**
 * Create a date in local timezone from YYYY-MM-DD string
 */
export const createLocalDate = (dateString: string): Date => {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  // Fallback to regular Date constructor
  return new Date(dateString);
};

/**
 * Format a date string consistently for display (MM/DD/YYYY)
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = createLocalDate(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
};

/**
 * Parse various time formats commonly found in Excel/CSV files
 */
export const parseTime = (timeValue: any): Date | null => {
  if (!timeValue) return null;
  
  const timeStr = String(timeValue).trim();
  if (!timeStr) return null;
  
  // Common time formats: HH:MM, H:MM, HH:MM:SS, H:MM:SS
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const match = timeStr.match(timeRegex);
  
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    
    // Validate ranges
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
    }
  }
  
  // Try native Date parsing as fallback
  const nativeTime = new Date(`1970-01-01T${timeStr}`);
  if (!isNaN(nativeTime.getTime())) {
    return nativeTime;
  }
  
  return null;
};

/**
 * Create a time in local timezone from HH:MM string
 */
export const createLocalTime = (timeString: string): Date => {
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
  }
  // Fallback to regular Date constructor
  return new Date(`1970-01-01T${timeString}`);
};

/**
 * Format a time string consistently for display (HH:MM AM/PM)
 */
export const formatTimeForDisplay = (timeString: string): string => {
  const time = createLocalTime(timeString);
  return time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Detect if a column likely contains times based on sample values
 */
export const isLikelyTimeColumn = (values: any[]): boolean => {
  if (values.length === 0) return false;
  
  const sampleSize = Math.min(10, values.length);
  const sampleValues = values.slice(0, sampleSize).filter(v => v !== null && v !== undefined && v !== '');
  
  if (sampleValues.length === 0) return false;
  
  const timeCount = sampleValues.filter(val => parseTime(val) !== null).length;
  const timeRatio = timeCount / sampleValues.length;
  
  // If more than 70% of sample values are valid times, consider it a time column
  return timeRatio > 0.7;
};

/**
 * Get time columns from file data
 */
export const getTimeColumns = (fileData: FileData): string[] => {
  return fileData.columns
    .filter(col => col.headerName?.toLowerCase().includes('time'))
    .map(col => col.headerName || col.field);
};

/**
 * Apply date filters to rows
 */
export const applyDateFilters = (rows: GridRowsProp, filters: DateFilterCriteria[], columns: GridColDef[]): GridRowsProp => {
  if (filters.length === 0) return rows;
  
  return rows.filter(row => {
    return filters.every(filter => {
      // Find the column field by header name
      const column = columns.find(col => col.headerName === filter.column || col.field === filter.column);
      if (!column) return true;
      
      const cellValue = row[column.field];
      const cellDate = parseDate(cellValue);
      
      if (!cellDate) return true; // Keep rows with invalid dates
      
      // Create filter dates in local timezone to match parsed dates
      const filterStartDate = createLocalDate(filter.startDate);
      
      switch (filter.operator) {
        case 'before':
          return cellDate < filterStartDate;
        case 'after':
          return cellDate > filterStartDate;
        case 'between':
          if (!filter.endDate) return cellDate > filterStartDate;
          const filterEndDate = createLocalDate(filter.endDate);
          return cellDate >= filterStartDate && cellDate <= filterEndDate;
        default:
          return true;
      }
    });
  });
};

/**
 * Detect if a column likely contains dates based on sample values
 */
export const isLikelyDateColumn = (values: any[]): boolean => {
  if (values.length === 0) return false;
  
  const sampleSize = Math.min(10, values.length);
  const sampleValues = values.slice(0, sampleSize).filter(v => v !== null && v !== undefined && v !== '');
  
  if (sampleValues.length === 0) return false;
  
  const dateCount = sampleValues.filter(val => parseDate(val) !== null).length;
  const dateRatio = dateCount / sampleValues.length;
  
  // If more than 70% of sample values are valid dates, consider it a date column
  return dateRatio > 0.7;
};

/**
 * Apply time filters to rows
 */
export const applyTimeFilters = (rows: GridRowsProp, filters: TimeFilterCriteria[], columns: GridColDef[]): GridRowsProp => {
  if (filters.length === 0) return rows;
  
  return rows.filter(row => {
    return filters.every(filter => {
      // Find the column field by header name
      const column = columns.find(col => col.headerName === filter.column || col.field === filter.column);
      if (!column) return true;
      
      const cellValue = row[column.field];
      const cellTime = parseTime(cellValue);
      
      if (!cellTime) return true; // Keep rows with invalid times
      
      // Create filter times in local timezone
      const filterStartTime = createLocalTime(filter.startTime);
      
      switch (filter.operator) {
        case 'before':
          return cellTime < filterStartTime;
        case 'after':
          return cellTime > filterStartTime;
        case 'between':
          if (!filter.endTime) return cellTime > filterStartTime;
          const filterEndTime = createLocalTime(filter.endTime);
          return cellTime >= filterStartTime && cellTime <= filterEndTime;
        default:
          return true;
      }
    });
  });
};

