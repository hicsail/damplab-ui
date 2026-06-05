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

function formatMoney(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return `$${numeric.toFixed(2)}`;
}

function getPricingValue(row: any, key: 'internal' | 'externalAcademic' | 'externalMarket' | 'externalNoSalary'): unknown {
  const pricing = row?.pricing ?? {};

  if (key === 'internal') return pricing.internal ?? row?.internalPrice;
  if (key === 'externalAcademic') return pricing.externalAcademic ?? row?.externalAcademicPrice;
  if (key === 'externalMarket')
    return (
      pricing.externalMarket ??
      pricing.external ??
      row?.externalMarketPrice ??
      row?.externalPrice
    );
  return pricing.externalNoSalary ?? row?.externalNoSalaryPrice;
}

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
      field: 'pricingInternal',
      headerName: 'Internal',
      width: 120,
      type: 'number',
      valueGetter: (_value, row) => getPricingValue(row, 'internal'),
      valueFormatter: (value) => formatMoney(value),
    },
    {
      field: 'pricingExternalAcademic',
      headerName: 'External (Academic)',
      width: 170,
      type: 'number',
      valueGetter: (_value, row) => getPricingValue(row, 'externalAcademic'),
      valueFormatter: (value) => formatMoney(value),
    },
    {
      field: 'pricingExternalMarket',
      headerName: 'External (Market)',
      width: 160,
      type: 'number',
      valueGetter: (_value, row) => getPricingValue(row, 'externalMarket'),
      valueFormatter: (value) => formatMoney(value),
    },
    {
      field: 'pricingExternalNoSalary',
      headerName: 'External (No Salary)',
      width: 180,
      type: 'number',
      valueGetter: (_value, row) => getPricingValue(row, 'externalNoSalary'),
      valueFormatter: (value) => formatMoney(value),
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
        Services Catalog
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Read-only view of DAMPLab services, their parameters, and pricing. Prices are shown across the four customer categories.
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              size="small"
              variant="outlined"
              label={`Internal: ${formatMoney(getPricingValue(selectedService, 'internal')) || '—'}`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`External (Academic): ${formatMoney(getPricingValue(selectedService, 'externalAcademic')) || '—'}`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`External (Market): ${formatMoney(getPricingValue(selectedService, 'externalMarket')) || '—'}`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`External (No Salary): ${formatMoney(getPricingValue(selectedService, 'externalNoSalary')) || '—'}`}
            />
          </Box>

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

