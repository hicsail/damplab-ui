import React, { useState } from 'react';
import ParamTableDisplay from './ParamTableDisplay';

const DisplayExample: React.FC = () => {
  const columns: any[] = [
    { header: 'Step', field: 'step' },
    { header: 'Temp (C)', field: 'temp' },
    { header: 'Time', field: 'time' },
    { header: 'Notes', field: 'notes' }
  ];

  const [rows, setRows] = useState<any[]>([
    { step: 'Initial Denaturation', temp: 98, time: '30 seconds', notes: 'Initial Denaturation' },
    { step: '35 Cycles', temp: 98, time: '10 seconds', notes: 'DNA Denaturation' },
    { step: '', temp: 65, time: '20 seconds', notes: 'DNA Annealing' },
    { step: '', temp: 72, time: '30 seconds', notes: 'DNA Extension' },
    { step: 'Final Extension', temp: 72, time: '5 minutes', notes: 'Final Extension' },
    { step: 'Hold', temp: 4, time: 'Infinite', notes: 'Hold' }
  ]);

  const handleSave = (updatedRows: any[]) => {
    setRows(updatedRows); // Update the rows with the new data
  };

  return (
    <ParamTableDisplay title="Thermal Cycler Conditions" columns={columns} rows={rows} onSave={handleSave} />
  );
};

export default DisplayExample;
