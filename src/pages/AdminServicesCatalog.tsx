import React, { useContext, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { AppContext } from '../contexts/App';

export default function AdminServicesCatalog() {
  const { services } = useContext(AppContext);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const rows = useMemo(
    () => (Array.isArray(services) ? services : []),
    [services]
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Service',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 260,
    },
    {
      field: 'pricingMode',
      headerName: 'Pricing Mode',
      width: 160,
      valueGetter: (_value, row) => row.pricingMode ?? 'SERVICE',
      valueFormatter: (value) =>
        value === 'PARAMETER' ? 'Parameter-based' : 'Service price',
    },
    {
      field: 'price',
      headerName: 'Service Price',
      width: 140,
      type: 'number',
      valueFormatter: (value) => {
        if (value === undefined || value === null || value === '') return '';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '';
        return `$${numeric.toFixed(2)}`;
      },
    },
    {
      field: 'parameters',
      headerName: 'Parameters',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const count = Array.isArray(params.row.parameters)
          ? params.row.parameters.length
          : 0;
        return (
          <Chip
            size="small"
            label={`${count} param${count === 1 ? '' : 's'}`}
            variant="outlined"
            onClick={() => setSelectedService(params.row)}
          />
        );
      },
    },
  ];

  const handleCloseDialog = () => setSelectedService(null);

  const parameters = Array.isArray(selectedService?.parameters)
    ? selectedService.parameters
    : [];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h4" gutterBottom>
        Admin Services Catalog (Read-only)
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        View DAMPLab services, their parameters, and pricing details. This page is read-only for all non‑staff users.
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedService}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedService?.name || 'Service parameters'}
        </DialogTitle>
        <DialogContent dividers>
          {parameters.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No parameters are defined for this service.
            </Typography>
          ) : (
            <List dense>
              {parameters.map((p: any) => (
                <ListItem key={p.id || p.name}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{p.name}</Typography>
                        {p.required && (
                          <Chip label="Required" size="small" color="primary" />
                        )}
                        {typeof p.price === 'number' && (
                          <Chip
                            label={`Param price: $${p.price.toFixed(2)}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        {p.description && (
                          <Typography variant="body2" color="text.secondary">
                            {p.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Type: {p.type} · ParamType: {p.paramType}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

