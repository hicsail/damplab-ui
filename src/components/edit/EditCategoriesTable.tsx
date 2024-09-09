import { useApolloClient, useQuery } from '@apollo/client';
import { CREATE_CATEGORY, DELETE_CATEGORY, GET_CATEGORIES, UPDATE_CATEGORY } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowModel,
  GridSlots
} from '@mui/x-data-grid';
import { ServiceSelection } from './ServiceSelection';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { GridToolBar } from './GridToolBar';


export const EditCategoriesTable: React.FC = () => {
  const { data, refetch } = useQuery(GET_CATEGORIES);
  const [rows, setRows] = useState<any[]>([]);
  const { services } = useContext(AppContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();

  useEffect(() => {
    if (data) {
      setRows(data.categories);
      return;
    }
    setRows([]);
  }, [data]);

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
    console.log(rowModesModel);
    console.log(id);
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleUpdate = async (newRow: GridRowModel) => {
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

  const handleCreate = async (newRow: GridRowModel) => {
    const newCateogry = {
      label: newRow.label || '',
      services: newRow.services ? newRow.services.map((service: any) => service.id) : []
    };

    await client.mutate({
      mutation: CREATE_CATEGORY,
      variables: {
        category: newCateogry
      }
    });

    refetch();

    return { ...newRow, isNew: false };
  }

  const processRowUpdate = async (newRow: GridRowModel) => {
    if (!newRow.isNew) {
      return handleUpdate(newRow);
    } else {
      return handleCreate(newRow);
    }
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
      rows={rows}
      columns={columns}
      rowModesModel={rowModesModel}
      onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
      onRowEditStop={handleRowEditStop}
      onProcessRowUpdateError={(error) => console.log(error)}
      editMode="row"
      processRowUpdate={processRowUpdate}
      slots={{
        toolbar: GridToolBar as GridSlots['toolbar']
      }}
      slotProps={{
        toolbar: { setRowModesModel, setRows },
      }}
    />
  );
};
