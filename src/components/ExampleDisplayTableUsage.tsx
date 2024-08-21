import React, { useState } from 'react';
import ParamTableDisplay from './ParamTableDisplay';

interface Props {
  title: string;
  columns: any[];
  rows: any[];
}

const DisplayExample: React.FC<Props> = ({title, columns, rows: inputRows}) => {
  
  const [rows, setRows] = useState<any[]>(inputRows);

  const handleSave = (updatedRows: any[]) => {
    setRows(updatedRows); // Update the rows with the new data
  };

  return (
    <ParamTableDisplay title={title} columns={columns} rows={rows} onSave={handleSave} />
  );
};

export default DisplayExample;