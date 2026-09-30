import { useApolloClient } from '@apollo/client';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useContext, useMemo, useState } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { CREATE_SERVICE, CREATE_UPLOAD_LOG, UPDATE_SERVICE } from '../../gql/queries';
import { formatGqlError } from '../../utils/gqlError';
import type { SetRef } from '../../utils/serviceParameters';
import { OperationColumn, OperationLike } from './operationsSheet';
import { beforeSnapshot, buildOperationCreateInput, buildOperationUpdateChanges, OPTIONAL_UPLOAD_COLUMNS, ParsedOperationsSheet } from './operationsUploadUtils';

export interface OperationsUploadSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface OperationsUploadPreviewProps {
  parsed: ParsedOperationsSheet;
  fileName: string;
  existing: OperationLike[];
  sets: SetRef[];
  open: boolean;
  onClose: () => void;
  onComplete: (summary: OperationsUploadSummary) => void;
}

export function OperationsUploadPreview({ parsed, fileName, existing, sets, open, onClose, onComplete }: OperationsUploadPreviewProps) {
  const client = useApolloClient();
  const { userProps } = useContext(UserContext);
  const optionalPresent = OPTIONAL_UPLOAD_COLUMNS.filter((c) => parsed.presentColumns.includes(c));
  const [selectedColumns, setSelectedColumns] = useState<Set<OperationColumn>>(() => new Set<OperationColumn>(['id', 'name', ...optionalPresent]));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set(parsed.rows.filter((r) => r.selectedByDefault).map((r) => r.rowNumber)));
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const existingById = useMemo(() => new Map(existing.map((o) => [String(o.id), o])), [existing]);

  const counts = {
    create: parsed.rows.filter((r) => r.action === 'create' && selectedRows.has(r.rowNumber)).length,
    update: parsed.rows.filter((r) => r.action === 'update' && selectedRows.has(r.rowNumber)).length,
    skip: parsed.rows.filter((r) => r.action === 'skip' || !selectedRows.has(r.rowNumber)).length
  };

  const toggle = <T,>(set: Set<T>, key: T): Set<T> => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const handleImport = async () => {
    setImporting(true);
    const uploaderName = userProps?.idTokenParsed?.name || userProps?.idTokenParsed?.preferred_username || 'unknown';
    const summary: OperationsUploadSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
    const affectedItemIds: string[] = [];
    const fieldSnapshots: Array<{ itemId: string; action: string; before?: Record<string, unknown>; after?: Record<string, unknown> }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      setProgress(Math.round(((i + 1) / parsed.rows.length) * 100));
      if (row.action === 'skip' || !selectedRows.has(row.rowNumber)) {
        summary.skipped += 1;
        continue;
      }
      try {
        if (row.action === 'update') {
          const current = existingById.get(row.existingId!)!;
          const changes = buildOperationUpdateChanges(row, selectedColumns, current, sets);
          if (Object.keys(changes).length === 0) {
            summary.skipped += 1;
            continue;
          }
          await client.mutate({ mutation: UPDATE_SERVICE, variables: { service: row.existingId, changes } });
          affectedItemIds.push(row.existingId!);
          fieldSnapshots.push({ itemId: row.existingId!, action: 'UPDATE', before: beforeSnapshot(current, changes), after: changes });
          summary.updated += 1;
        } else {
          const input = buildOperationCreateInput(row, selectedColumns, sets);
          const result = await client.mutate({ mutation: CREATE_SERVICE, variables: { service: input } });
          const id = result.data?.createService?.id;
          if (id) {
            affectedItemIds.push(id);
            fieldSnapshots.push({ itemId: id, action: 'CREATE', after: input });
          }
          summary.created += 1;
        }
      } catch (e) {
        // Pin 29: the server's own message (a set clash names the id and both sets); the rest continue.
        summary.errors.push(`Row ${row.rowNumber}: ${formatGqlError(e)}`);
      }
    }

    try {
      await client.mutate({
        mutation: CREATE_UPLOAD_LOG,
        variables: {
          input: {
            entityType: 'OPERATION',
            uploaderName,
            uploaderSub: userProps?.subject,
            fileName,
            rowCount: parsed.rows.length,
            createdCount: summary.created,
            updatedCount: summary.updated,
            skippedCount: summary.skipped,
            failedCount: summary.errors.length,
            affectedItemIds,
            fieldSnapshots
          }
        }
      });
    } catch (e) {
      // Fix round 1: don't let the audit record vanish silently — the row-level
      // work already happened, so this must surface in the completion summary
      // rather than only the console, or "Import complete" would be a lie.
      console.error('Failed to create upload log:', e);
      summary.errors.push(`The upload history record could not be saved: ${formatGqlError(e)}`);
    }
    setImporting(false);
    onComplete(summary);
  };

  const columns: GridColDef[] = [
    {
      field: 'include', headerName: '', width: 50, sortable: false,
      renderCell: (p) => (
        <Checkbox size='small' disabled={importing || p.row.action === 'skip'} checked={selectedRows.has(p.row.rowNumber)} onChange={() => setSelectedRows((s) => toggle(s, p.row.rowNumber))} />
      )
    },
    { field: 'rowNumber', headerName: 'Row', width: 60 },
    { field: 'id', headerName: 'id', width: 210 },
    { field: 'name', headerName: 'name', width: 220, flex: 1, valueGetter: (_v, row) => row.values.name ?? '' },
    {
      field: 'action', headerName: 'Action', width: 100,
      renderCell: (p) => <Chip size='small' color={p.value === 'create' ? 'success' : p.value === 'update' ? 'info' : 'default'} label={p.value} />
    },
    {
      field: 'messages', headerName: 'Errors / warnings', width: 360, flex: 1, sortable: false,
      renderCell: (p) => (
        <Typography variant='caption' color={p.row.errors.length ? 'error.main' : 'warning.main'} sx={{ whiteSpace: 'normal' }}>
          {[...p.row.errors, ...p.row.warnings].join('; ')}
        </Typography>
      )
    }
  ];

  return (
    <Dialog open={open} onClose={importing ? undefined : onClose} maxWidth='lg' fullWidth>
      <DialogTitle>Import Operations Preview</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`${parsed.rows.length} rows`} />
            <Chip label={`${counts.create} to create`} color='success' variant='outlined' />
            <Chip label={`${counts.update} to update`} color='info' variant='outlined' />
            <Chip label={`${counts.skip} to skip`} variant='outlined' />
          </Box>
          <Alert severity='info'>Parameters are not imported. The Parameters sheet is ignored; edit parameters in the Catalog Editor.</Alert>
          <Box>
            <Typography variant='subtitle2' sx={{ mb: 0.5 }}>Columns to import (unticked columns are left unchanged):</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {optionalPresent.map((c) => (
                <FormControlLabel key={c} label={c} control={<Checkbox size='small' disabled={importing} checked={selectedColumns.has(c)} onChange={() => setSelectedColumns((s) => toggle(s, c))} />} />
              ))}
            </Box>
          </Box>
          {importing && <LinearProgress variant='determinate' value={progress} />}
          <Box sx={{ height: 400 }}>
            <DataGrid rows={parsed.rows} columns={columns} getRowId={(r) => r.rowNumber} density='compact' disableRowSelectionOnClick />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>Cancel</Button>
        <Button variant='contained' onClick={handleImport} disabled={importing || counts.create + counts.update === 0}>
          {importing ? 'Importing…' : `Import ${counts.create + counts.update} operations`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
