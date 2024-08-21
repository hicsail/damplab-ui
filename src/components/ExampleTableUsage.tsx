import React, { useState } from 'react';
import ParamTable from './ParamTable';

const ExampleUsage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([
    { label: 'Nuclease-free Water', value: 8.45 },
    { label: 'Buffer', value: '', isDropdown: true, options: ['Buffer A', 'Buffer B'] },
    { label: 'dNTPs', value: 0.5 },
    { label: 'Polymerase', value: '', isDropdown: true, options: ['Polymerase A', 'Polymerase B'] },
    { label: 'Forward primer', value: 1.3 },
    { label: 'Reverse primer', value: 1.25 },
    // Add more rows as needed
  ]);

  return (
    <div>
      <ParamTable title="PCR Setup" rows={rows} onChange={setRows} />
      <div>
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ExampleUsage;
