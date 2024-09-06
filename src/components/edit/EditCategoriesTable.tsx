import { useQuery } from '@apollo/client';
import { GET_CATEGORIES } from '../../gql/queries';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext } from 'react';
import { AppContext } from '../../contexts/App';


export const EditCategoriesTable: React.FC = () => {
  const { data } = useQuery(GET_CATEGORIES);
  const categories = data ? data.categories : [];
  const { services } = useContext(AppContext);

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
      renderCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} />
    }
  ];


  return (
    <DataGrid
      rows={categories}
      columns={columns}
    />
  );
};
