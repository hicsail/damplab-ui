import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowModesModel,
  GridRowModes,
  GridRenderEditCellParams,
  GridRowModel,
  GridEventListener,
  GridRowEditStopReasons,
  GridSlots
} from '@mui/x-data-grid';
import { getActionsColumn } from '../ActionColumn';
import { MutableRefObject, useState } from 'react';
import { GridApiCommunity } from '@mui/x-data-grid/internals';
import { GridToolBar } from '../GridToolBar';

interface EditParametersTableProps {
  viewParams: GridRenderCellParams | null;
  editParams: GridRenderEditCellParams | null;
  gridRef: MutableRefObject<GridApiCommunity>;
}

export const EditParametersTable: React.FC<EditParametersTableProps> = (props) => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const isEdit = !!props.editParams;
  const [rows, setRows] = useState<any[]>(props.viewParams ? props.viewParams.value : props.editParams!.value);

  const columns: GridColDef[] = [
    {
      field: 'id',
      width: 200,
      editable: isEdit
    },
    {
      field: 'name',
      width: 200,
      editable: isEdit
    },
    {
      field: 'type',
      width: 200,
      editable: isEdit
    },
    {
      field: 'flowId',
      width: 200,
      editable: isEdit
    },
    {
      field: 'paramType',
      width: 200,
      editable: isEdit
    },
    {
      field: 'required',
      width: 200,
      editable: isEdit
    },
    {
      field: 'workflowId',
      width: 200,
      editable: isEdit
    },
    {
      field: 'options',
      width: 200,
      editable: isEdit
    },
    {
      field: 'defaultValue',
      width: 200,
      editable: isEdit
    },
    {
      field: 'rangeValueMin',
      width: 200,
      editable: isEdit
    },
    {
      field: 'rangeValueMax',
      width: 200,
      editable: isEdit
    },
    {
      field: 'dynamicAdd',
      width: 200,
      editable: isEdit
    },
    {
      field: 'templateFile',
      width: 200,
      editable: isEdit
    },
    {
      field: 'tableData',
      width: 200,
      editable: isEdit
    },
    {
      field: 'paramGroupId',
      width: 200,
      editable: isEdit
    }
  ];

  const handleDeletion = async (id: GridRowId) => {
    // Filter out the grid
    const filtered = rows.filter((parameter: any) => parameter.id != id);

    // Update the edit state
    props.gridRef.current.setEditCellValue({ id: props.editParams!.id, field: props.editParams!.field, value: filtered });

    // Update the view
    setRows(filtered);
  };

  const handleSave = async(id: GridRowId) => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleUpdate = (newRow: GridRowModel) => {
    // Remove the old row
    const filtered = rows.filter((parameter: any) => parameter.id != newRow.id);

    // The new value
    props.gridRef.current.setEditCellValue({ id: props.editParams!.id, field: props.editParams!.field, value: [...filtered, newRow] });

    return newRow;
  };

  if (isEdit) {
    columns.push(
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
    );
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      sx={{ width: '200%' }}
      processRowUpdate={handleUpdate}
      editMode="row"
      rowModesModel={rowModesModel}
      onRowModesModelChange={(newMode) => setRowModesModel(newMode)}
      onRowEditStop={handleRowEditStop}
      slots={{
        toolbar: GridToolBar as GridSlots['toolbar']
      }}
      slotProps={{
        toolbar: { setRowModesModel, setRows }
      }}
    />
  );
};
