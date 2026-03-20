import { useApolloClient } from '@apollo/client';
import { CREATE_CATEGORY, CREATE_SERVICE, DELETE_SERVICE, UPDATE_SERVICE } from '../../gql/queries';
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowModesModel,
  GridActionsCellItem,
  GridSlots
} from '@mui/x-data-grid';
import { Box, Button, Snackbar, Alert, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { Edit, Delete } from '@mui/icons-material';
import { ServiceList } from './ServiceList';
import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/App';
import { GridToolBar } from './GridToolBar';
import { processCSVFile, processExcelFile, validateFileType } from '../data-translation/utils';
import { useNavigate } from 'react-router';

type ServiceRow = Record<string, unknown> & { id: GridRowId };

function formatPricingSummary(row: Record<string, unknown>): string {
  const pricing = (row as any).pricing ?? {};
  const parts: string[] = [];
  const intVal = pricing.internal ?? (row as any).internalPrice;
  if (intVal != null && intVal !== '') parts.push(`Int ${intVal}`);
  const acad = pricing.externalAcademic ?? (row as any).externalAcademicPrice;
  if (acad != null && acad !== '') parts.push(`Acad ${acad}`);
  const mkt =
    pricing.externalMarket ?? pricing.external ?? (row as any).externalMarketPrice ?? (row as any).externalPrice;
  if (mkt != null && mkt !== '') parts.push(`Mkt ${mkt}`);
  const nosal = pricing.externalNoSalary ?? (row as any).externalNoSalaryPrice;
  if (nosal != null && nosal !== '') parts.push(`No sal ${nosal}`);
  const leg = pricing.legacy ?? (row as any).price;
  if (leg != null && leg !== '') parts.push(`Legacy ${leg}`);
  return parts.length ? parts.join(' · ') : '—';
}

export const EditServicesTable: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const { services, refreshCatalog } = useContext(AppContext);
  const client = useApolloClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [, setRowModesModel] = useState<GridRowModesModel>({});

  useEffect(() => {
    setRows(services as ServiceRow[]);
  }, [services]);

  const handleDeletion = async (id: GridRowId) => {
    await client.mutate({
      mutation: DELETE_SERVICE,
      variables: {
        service: id
      }
    });
    await refreshCatalog();
  };

  const handleDownloadPricingSheet = () => {
    try {
      const headers = [
        'id',
        'name',
        'pricingInternal',
        'pricingExternalAcademic',
        'pricingExternalMarket',
        'pricingExternalNoSalary',
        'pricingLegacy'
      ];
      const dataLines = rows.map((row) => {
        const id = row.id ?? '';
        const name = (row as any).name ?? '';
        const pricing = (row as any).pricing ?? {};
        const internalPrice = pricing.internal ?? (row as any).internalPrice ?? '';
        const externalAcademicPrice =
          pricing.externalAcademic ?? (row as any).externalAcademicPrice ?? '';
        const externalMarketPrice =
          pricing.externalMarket ?? pricing.external ?? (row as any).externalMarketPrice ?? (row as any).externalPrice ?? '';
        const externalNoSalaryPrice =
          pricing.externalNoSalary ?? (row as any).externalNoSalaryPrice ?? '';
        const legacyPrice = pricing.legacy ?? (row as any).price ?? '';
        return [id, name, internalPrice, externalAcademicPrice, externalMarketPrice, externalNoSalaryPrice, legacyPrice]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',');
      });

      const csvContent = [headers.join(','), ...dataLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'services-pricing.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating pricing CSV:', error);
      setErrorMessage('Failed to generate pricing spreadsheet.');
    }
  };

  const handleUploadPricingSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = '';

    if (!validateFileType(file.name)) {
      setErrorMessage('Please upload a .csv, .xlsx or .xls file.');
      return;
    }

    try {
      let data: any[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = await processCSVFile(file);
      } else {
        data = await processExcelFile(file);
      }

      if (!data || data.length < 2) {
        setErrorMessage('Spreadsheet appears to be empty or missing data rows.');
        return;
      }

      const [headerRow, ...dataRows] = data;
      const normalizedHeaders = headerRow.map((h) => String(h || '').trim().toLowerCase());

      const idIndex = normalizedHeaders.findIndex((h) => h === 'id' || h === 'service id');
      const nameIndex = normalizedHeaders.findIndex((h) => h === 'name' || h === 'service name');
      const internalPriceIndex =
        normalizedHeaders.findIndex((h) => h === 'pricinginternal' || h === 'internalprice' || h === 'internal price');
      const externalAcademicPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalacademic' ||
            h === 'externalacademicprice' ||
            h === 'external academic price' ||
            h === 'external customer academic' ||
            h === 'external customer (academic)'
        );
      const externalMarketPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalmarket' ||
            h === 'externalmarketprice' ||
            h === 'external market price' ||
            h === 'pricingexternal' ||
            h === 'externalprice' ||
            h === 'external price' ||
            h === 'external customer market' ||
            h === 'external customer (market)'
        );
      const externalNoSalaryPriceIndex =
        normalizedHeaders.findIndex(
          (h) =>
            h === 'pricingexternalnosalary' ||
            h === 'externalnosalaryprice' ||
            h === 'external no salary price' ||
            h === 'external customer no salary' ||
            h === 'external customer (no salary)'
        );
      const priceIndex =
        normalizedHeaders.findIndex((h) => h === 'pricinglegacy' || h === 'price' || h === 'service price' || h === 'legacy price');

      if (
        idIndex === -1 ||
        nameIndex === -1 ||
        (internalPriceIndex === -1 &&
          externalAcademicPriceIndex === -1 &&
          externalMarketPriceIndex === -1 &&
          externalNoSalaryPriceIndex === -1 &&
          priceIndex === -1)
      ) {
        setErrorMessage(
          'Spreadsheet must have columns for id, name, and at least one price column (internal, external academic, external market, external no salary, or fallback/legacy).'
        );
        return;
      }

      let updateCount = 0;
      let createCount = 0;

      for (const row of dataRows) {
        const rawId = row[idIndex];
        const rawName = row[nameIndex];
        const rawInternalPrice = internalPriceIndex !== -1 ? row[internalPriceIndex] : undefined;
        const rawExternalAcademicPrice = externalAcademicPriceIndex !== -1 ? row[externalAcademicPriceIndex] : undefined;
        const rawExternalMarketPrice = externalMarketPriceIndex !== -1 ? row[externalMarketPriceIndex] : undefined;
        const rawExternalNoSalaryPrice = externalNoSalaryPriceIndex !== -1 ? row[externalNoSalaryPriceIndex] : undefined;
        const rawPrice = priceIndex !== -1 ? row[priceIndex] : undefined;

        const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
        const name = rawName !== undefined && rawName !== null ? String(rawName).trim() : '';
        const internalPriceStr =
          rawInternalPrice !== undefined && rawInternalPrice !== null ? String(rawInternalPrice).trim() : '';
        const externalAcademicPriceStr =
          rawExternalAcademicPrice !== undefined && rawExternalAcademicPrice !== null ? String(rawExternalAcademicPrice).trim() : '';
        const externalMarketPriceStr =
          rawExternalMarketPrice !== undefined && rawExternalMarketPrice !== null ? String(rawExternalMarketPrice).trim() : '';
        const externalNoSalaryPriceStr =
          rawExternalNoSalaryPrice !== undefined && rawExternalNoSalaryPrice !== null ? String(rawExternalNoSalaryPrice).trim() : '';
        const priceStr = rawPrice !== undefined && rawPrice !== null ? String(rawPrice).trim() : '';

        if (!id && !name && !priceStr) {
          continue;
        }

        const parseMoney = (s: string): number | null => {
          if (s === '') return null;
          const n = Number(s.replace(/[^0-9.\-]/g, ''));
          return Number.isFinite(n) ? n : null;
        };

        const internalPrice = parseMoney(internalPriceStr);
        const externalAcademicPrice = parseMoney(externalAcademicPriceStr);
        const externalMarketPrice = parseMoney(externalMarketPriceStr);
        const externalNoSalaryPrice = parseMoney(externalNoSalaryPriceStr);
        const price = parseMoney(priceStr);

        const hasInvalid =
          (internalPriceStr !== '' && (internalPrice === null || internalPrice < 0)) ||
          (externalAcademicPriceStr !== '' && (externalAcademicPrice === null || externalAcademicPrice < 0)) ||
          (externalMarketPriceStr !== '' && (externalMarketPrice === null || externalMarketPrice < 0)) ||
          (externalNoSalaryPriceStr !== '' && (externalNoSalaryPrice === null || externalNoSalaryPrice < 0)) ||
          (priceStr !== '' && (price === null || price < 0));
        if (hasInvalid) {
          console.warn('Skipping row with invalid price:', row);
          continue;
        }

        if (id) {
          const existingRow = rows.find((r) => String(r.id) === id);

          if (existingRow) {
            const changes: any = {};
            if (name && name !== (existingRow as any).name) {
              changes.name = name;
            }
            if (internalPriceStr !== '') {
              changes.internalPrice = internalPrice;
            }
            if (externalAcademicPriceStr !== '') {
              changes.externalAcademicPrice = externalAcademic;
            }
            if (externalMarketPriceStr !== '') {
              changes.externalMarketPrice = externalMarketPrice;
              changes.externalPrice = externalMarketPrice;
            }
            if (externalNoSalaryPriceStr !== '') {
              changes.externalNoSalaryPrice = externalNoSalaryPrice;
            }
            if (priceStr !== '') {
              changes.price = price;
            }
            if (
              internalPriceStr !== '' ||
              externalAcademicPriceStr !== '' ||
              externalMarketPriceStr !== '' ||
              externalNoSalaryPriceStr !== '' ||
              priceStr !== ''
            ) {
              changes.pricing = {
                internal: internalPrice,
                external: externalMarketPrice,
                externalAcademic: externalAcademicPrice,
                externalMarket: externalMarketPrice,
                externalNoSalary: externalNoSalaryPrice,
                legacy: price
              };
            }

            if (Object.keys(changes).length === 0) {
              continue;
            }

            await client.mutate({
              mutation: UPDATE_SERVICE,
              variables: {
                service: id,
                changes
              }
            });
            updateCount += 1;
            continue;
          }
        }

        if (!name) {
          console.warn('Skipping row without name for new service:', row);
          continue;
        }

        const newService = {
          name,
          icon: '',
          price,
          internalPrice,
          externalPrice: externalMarketPrice,
          externalAcademicPrice,
          externalMarketPrice,
          externalNoSalaryPrice,
          pricing: {
            internal: internalPrice,
            external: externalMarketPrice,
            externalAcademic: externalAcademicPrice,
            externalMarket: externalMarketPrice,
            externalNoSalary: externalNoSalaryPrice,
            legacy: price
          },
          pricingMode: 'SERVICE',
          parameters: [],
          paramGroups: [],
          allowedConnections: [],
          description: '',
          deliverables: []
        };

        await client.mutate({
          mutation: CREATE_SERVICE,
          variables: {
            service: newService
          }
        });
        createCount += 1;
      }

      await refreshCatalog();

      setErrorMessage(`Pricing upload complete: updated ${updateCount} service(s), created ${createCount} new service(s).`);
    } catch (error) {
      console.error('Error processing pricing spreadsheet:', error);
      setErrorMessage('Failed to process pricing spreadsheet.');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Edit"
          onClick={() => navigate(`/edit/services/${id}`)}
          color="inherit"
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDeletion(id)}
          color="inherit"
        />
      ]
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 500,
      flex: 1,
      minWidth: 180
    },
    {
      field: 'pricing',
      headerName: 'Pricing',
      width: 240,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {formatPricingSummary(params.row)}
        </Typography>
      )
    },
    {
      field: 'pricingMode',
      headerName: 'How Price Is Calculated',
      width: 220,
      valueGetter: (_value, row) => (row as any).pricingMode ?? 'SERVICE',
      valueFormatter: (value) => {
        if (value === 'PARAMETER') return 'Based on selected options';
        return 'Service price';
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 400,
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 0.5 }}>
          {(params.row as any).description ?? '—'}
        </Typography>
      )
    },
    {
      field: 'allowedConnections',
      headerName: 'Can Be Combined With',
      width: 320,
      renderCell: (params) => <ServiceList services={(params.row as any).allowedConnections} />
    },
    {
      field: 'parameters',
      headerName: 'Parameters',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(`/edit/services/${params.row.id}/parameters`)}
        >
          Configure ({(params.row as any).parameters?.length ?? 0})
        </Button>
      )
    },
    {
      field: 'deliverables',
      headerName: 'Deliverables',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const n = (params.row as any).deliverables?.length ?? 0;
        return (
          <Typography variant="body2" color="text.secondary">
            {n} item{n !== 1 ? 's' : ''} — edit service
          </Typography>
        );
      }
    }
  ];

  return (
    <>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPricingSheet}>
            Download pricing sheet
          </Button>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
            Upload pricing sheet
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleUploadPricingSheet}
          />
        </Box>
        <DataGrid
          rows={rows}
          columns={columns}
          slots={{
            toolbar: GridToolBar as GridSlots['toolbar']
          }}
          slotProps={{
            toolbar: {
              setRowModesModel,
              addButtonLabel: 'Add new service',
              onAdd: () => navigate('/edit/services/new'),
              showEditModeHint: false
            }
          }}
        />
      </Stack>
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity={errorMessage?.includes('complete') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
