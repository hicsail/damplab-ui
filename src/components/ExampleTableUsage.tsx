import React, { useState } from 'react';
import ParamTable from './ParamTable';

const ExampleUsage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([
    { step: 'Initial Denaturation', temp: 98, time: '30 seconds', notes: 'Initial Denaturation' },
    { step: '35 Cycles', temp: 98, time: '10 seconds', notes: 'DNA Denaturation' },
    // Add more rows as needed
  ]);

  const columns: any[] = [
    { header: 'Step', field: 'step' },
    { header: 'Temp (C)', field: 'temp', isDropdown: false },
    { header: 'Time', field: 'time' },
    { header: 'Notes', field: 'notes' }
  ];

  return (
    <div>
      <ParamTable title="Thermal Cycler Conditions" columns={columns} rows={rows} onChange={setRows} />
      <div>
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ExampleUsage;
