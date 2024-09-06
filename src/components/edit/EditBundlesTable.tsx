import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useContext } from 'react';
import { AppContext } from '../../contexts/App';
import { ServiceSelection } from './ServiceSelection';

export const EditBundlesTable: React.FC = () => {
  const { bundles, services } = useContext(AppContext);

  const columns: GridColDef[] = [
    {
      field: 'label',
      width: 500,
      editable: true
    },
    {
      field: 'services',
      headerName: 'Services',
      width: 500,
      renderCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} params={params} />
    }
  ];

  return (
    <DataGrid
      rows={bundles}
      columns={columns}
    />
  );
};
