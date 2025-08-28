import { useApolloClient } from '@apollo/client';
import { DELETE_BUNDLE, CREATE_BUNDLE, UPDATE_BUNDLE } from '../../gql/mutations';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridRowModel,
  GridEventListener,
  GridRowEditStopReasons,
  GridRenderCellParams,
  GridRenderEditCellParams,
  useGridApiRef
} from '@mui/x-data-grid';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { getActionsColumn } from './ActionColumn';
import { ServiceList } from './ServiceList';
import { ServiceSelection } from './ServiceSelection';
import { Snackbar, Alert, IconButton } from '@mui/material';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import { GridToolBar } from './GridToolBar';
import { BundleCanvasPopup } from './BundleCanvasPopup';

type BundleRow = GridRowModel & {
  error?: string;
  isNew?: boolean;
};

export const EditBundlesTable: React.FC = () => {
  const { bundles, services } = useContext(AppContext);
  const [rows, setRows] = useState<BundleRow[]>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const client = useApolloClient();
  const gridRef = useGridApiRef();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<any>(null);

useEffect(() => {
  const rowsWithServices = bundles.map((bundle) => ({
    ...bundle,
    services: bundle.nodes?.map((node: any) => node.service).filter(Boolean)
  }));
  setRows(rowsWithServices);
}, [bundles]);

  const handleEditBundleServices = (bundle: any) => {
    setSelectedBundle(bundle);
    setPopupOpen(true);
  };

  const handleUpdateBundle = async (updatedBundle: any) => {
    try {
      // Map nodes from canvas to backend format
      const nodeChanges = updatedBundle.nodes.map((n: any) => ({
        id: n.id,
        label: n.label,
        serviceId: n.serviceId,
        position: n.position ? { x: n.position.x, y: n.position.y } : null,
      }));

      // Map canvas IDs to backend node IDs for edges
      const byServiceId: Record<string, string> = {};
        updatedBundle.nodes.forEach((n: any) => {
          if (n.id) byServiceId[n.serviceId] = n.id;
        });
      
      const edgeChanges = updatedBundle.edges
        ?.map((e: any) => {
          const sourceDb = byServiceId[e.sourceCanvasId];
          const targetDb = byServiceId[e.targetCanvasId];
          if (!sourceDb || !targetDb) return null; // skip edges with missing nodes
          return {
            id: e.id || null,
            source: sourceDb,
            target: targetDb,
            reactEdge: JSON.stringify({ ...e.reactEdge, source: sourceDb, target: targetDb }),
          };
        })
        .filter(Boolean);

      const changes = {
        label: updatedBundle.label,
        icon: updatedBundle.icon || null,
        nodes: nodeChanges,
        edges: edgeChanges || [],
      };

      const { data } = await client.mutate({
        mutation: UPDATE_BUNDLE,
        variables: {
          bundle: updatedBundle.id,
          changes,
        },
      });
      const savedBundle = data.updateBundle;


      setRows((prev) =>
        prev.map((row) =>
          row.id === updatedBundle.id
            ? {
                ...row,
                label: savedBundle.label,
                icon: savedBundle.icon,
                nodes: savedBundle.nodes,
                edges: savedBundle.edges,
                services: savedBundle.nodes?.map((n: any) => n.service).filter(Boolean),
              }
            : row
        )
      );
    } catch (err) {
      console.error('Error updating bundle:', err);
      setErrorMessage('Failed to update bundle');
    }
  };

  // DELETE
  const handleDeletion = async (id: GridRowId) => {
    try {
      await client.mutate({
        mutation: DELETE_BUNDLE,
        variables: { id }
      });
      setRows(rows.filter((row) => row.id !== id));
    } catch (err) {
      console.error('Error deleting bundle:', err);
      setErrorMessage('Failed to delete bundle');
    }
  };

  // UPDATE
  const handleUpdate = async (newRow: GridRowModel) => {
    const changes = {
      label: newRow.label,
      icon: newRow.icon || null,
    };

    try {
      await client.mutate({
        mutation: UPDATE_BUNDLE,
        variables: {
          bundle: newRow.id,
          changes
        }
      });

      return newRow;
    } catch (err) {
      console.error('Error updating bundle:', err);
      setErrorMessage('Failed to update bundle');
      throw err;
    }
  };

  // CREATE
  const handleCreate = async (newRow: GridRowModel) => {
    const input = {
      label: newRow.label || '',
      icon: newRow.icon || null,
    };

    console.log("CreateBundle input:", JSON.stringify({ input }, null, 2));

    try {
      const result = await client.mutate({
        mutation: CREATE_BUNDLE,
        variables: { input },
      });

      setRows((prev) =>
        prev.map((row) =>
          row.id === newRow.id ? { ...result.data.createBundle, isNew: false } : row
        )
      );

      return { ...result.data.createBundle, isNew: false };
    } catch (err) {
      console.error('Error creating bundle:', err);
      setErrorMessage('Failed to create bundle');
      throw err;
    }
  };

  const processRowUpdate = async (newRow: BundleRow) => {
    try {
      if (!newRow.isNew) {
        return await handleUpdate(newRow);
      } else {
        return await handleCreate(newRow);
      }
    } catch (err) {
      return { ...newRow, error: 'Save failed' };
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
      headerName: 'Bundle Name',
      width: 500,
      editable: true
    },
    {
      field: 'services',
      headerName: 'Services',
      width: 400,
      renderCell: (params: GridRenderCellParams) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <ServiceList services={params.row.services} />
          </div>
          <IconButton
            onClick={() => handleEditBundleServices(params.row)}
            title="Edit services in canvas"
            sx={{ color: "black" }}
          >
            <DashboardCustomizeIcon/>
          </IconButton>
        </div>
      ),
      renderEditCell: (params: GridRenderEditCellParams) => (
        <ServiceSelection 
          allServices={services} 
          selectedServices={params.row.services} 
          {...params} 
        />
      )
    },
    {
      field: 'serviceCount',
      headerName: 'Service Count',
      width: 120,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <span>{params.row.services?.length || 0}</span>
      )
    },
    getActionsColumn({
      handleDelete: handleDeletion,
      handleEdit: (id) =>
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } }),
      handleCancel: (id) =>
        setRowModesModel({
          ...rowModesModel,
          [id]: { mode: GridRowModes.View, ignoreModifications: true }
        }),
      handleSave: (id) =>
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } }),
      rowModesModel
    })
  ];

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columns}
        rowModesModel={rowModesModel}
        onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        editMode="row"
        slots={{
          toolbar: GridToolBar as any
        }}
        slotProps={{
          toolbar: { setRowModesModel, setRows }
        }}
        apiRef={gridRef}
        sx={{
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center'
          }
        }}
      />
      
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={4000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      <BundleCanvasPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        bundle={selectedBundle}
        allServices={services}
        onSave={(result) => { // result has { nodes, edges }
          console.log(result)
          if (selectedBundle) {
            const updatedBundle = { 
              ...selectedBundle, 
              nodes: result.nodes,   // save updated nodes
              edges: result.edges,   // save updated edges
            };
            handleUpdateBundle(updatedBundle);
          }
          setPopupOpen(false);
        }}
      />
    </>
  );
};