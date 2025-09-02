import { useState, useRef } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { FileData, AlertState } from '../types';
import { 
  validateFileType, 
  processCSVFile, 
  processExcelFile, 
  analyzeColumnTypes, 
  createColumnsFromHeaders, 
  createRowsFromData 
} from '../utils';

export const useFileUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    setFileData: (data: FileData) => void,
    setAlert: (alert: AlertState) => void
  ): Promise<void> => {
    // Validate file type
    if (!validateFileType(file.name)) {
      setAlert({
        open: true,
        message: 'Please upload an Excel file (.xlsx, .xls) or CSV file.',
        severity: 'error'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let jsonData: any[][];
      
      if (file.name.match(/\.csv$/i)) {
        jsonData = await processCSVFile(file);
      } else {
        jsonData = await processExcelFile(file);
      }
      
      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty.');
      }

      // Extract headers from first row
      const headers = jsonData[0] || [];
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));

      if (headers.length === 0) {
        throw new Error('No columns found in the file.');
      }

      // Analyze data types for each column
      const columnTypes = analyzeColumnTypes(headers, dataRows);

      // Create columns definition with auto-detected types
      const columns = createColumnsFromHeaders(headers, columnTypes);

      // Create rows data with proper type conversion
      const rows = createRowsFromData(headers, dataRows, columnTypes);

      setFileData({
        fileName: file.name,
        columns,
        rows
      });

      setAlert({
        open: true,
        message: `Successfully loaded ${file.name} with ${headers.length} columns and ${dataRows.length} rows. Data types auto-detected.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error processing file:', error);
      setAlert({
        open: true,
        message: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return {
    isProcessing,
    fileInputRef,
    handleFileUpload,
    triggerFileInput
  };
};
