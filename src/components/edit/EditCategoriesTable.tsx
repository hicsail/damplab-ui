import { useApolloClient, useQuery } from '@apollo/client';
import { DELETE_CATEGORY, GET_CATEGORIES, UPDATE_CATEGORY } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowModel
} from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';


export const EditCategoriesTable: React.FC = () => {
  const { data, refetch } = useQuery(GET_CATEGORIES);
  const categories = data ? data.categories : [];
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();

  const handleDeletion = async (id: GridRowId) => {
    await client.mutate({
      mutation: DELETE_CATEGORY,
      variables: {
        category: id
      }
    });
    refetch();
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const processRowUpdate = async (newRow: GridRowModel) => {
    // The services need to be a list of IDs
    const changes = {
      label: newRow.label,
      services: newRow.services.map((service: any) => service.id)
    };

    await client.mutate({
      mutation: UPDATE_CATEGORY,
      variables: {
        category: newRow.id,
        changes
      }
    });

    return newRow;
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

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
      renderEditCell: (params) => <ServiceSelection allServices={services} selectedServices={params.row.services} {...params} />
    },
    getActionsColumn({
      handleDelete: (id) => handleDeletion(id),
      handleEdit: (id) => setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) => setRowModesModel({
        ...rowModesModel,
        [id]: { mode: GridRowModes.View, ignoreModifications: true }
      }),
      handleSave: (id) => handleSave(id),
      rowModesModel
    })
  ];

  return (
    <DataGrid
      rows={categories}
      columns={columns}
      rowModesModel={rowModesModel}
      onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
      onRowEditStop={handleRowEditStop}
      slotProps={{
        toolbar: { setRowModesModel },
      }}
      editMode="row"
      processRowUpdate={processRowUpdate}
    />
  );
};
