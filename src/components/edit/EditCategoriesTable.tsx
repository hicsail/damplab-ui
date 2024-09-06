import { useQuery } from '@apollo/client';
import { GET_CATEGORIES } from '../../gql/queries';
import { DataGrid, GridColDef, GridRowModesModel, GridRowModes } from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';


export const EditCategoriesTable: React.FC = () => {
  const { data } = useQuery(GET_CATEGORIES);
  const categories = data ? data.categories : [];
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

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
      editable: true,
      renderCell: (params) => <ServiceList services={params.row.services} />,
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} params={params} />
    },
    getActionsColumn({
      handleDelete: (_id) => {},
      handleEdit: (id) => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) => setRowModesModel({
        ...rowModesModel,
        [id]: { mode: GridRowModes.View, ignoreModifications: true }
      }),
      handleSave: (_id) => {},
      rowModesModel
    })
  ];

  return (
    <DataGrid
      rows={categories}
      columns={columns}
      rowModesModel={rowModesModel}
      onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
      slotProps={{
        toolbar: { setRowModesModel },
      }}
      editMode="row"
    />
  );
};
