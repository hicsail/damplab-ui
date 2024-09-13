import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useContext } from 'react';
import { AppContext } from '../../contexts/App';
import { ServiceSelection } from './ServiceSelection';
import { ServiceList } from './ServiceList';

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
      renderCell: (params) => <ServiceList services={params.row.services} />,
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} />
    }
  ];

  return (
    <DataGrid
      rows={bundles}
      columns={columns}
    />
  );
};
