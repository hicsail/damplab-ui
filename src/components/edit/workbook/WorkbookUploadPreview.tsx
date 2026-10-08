import { useApolloClient } from '@apollo/client';
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useContext, useMemo, useState } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import { formatGqlError } from '../../../utils/gqlError';
import { ApplySummary, applyWorkbook, stoppedSummary } from './applyWorkbook';
import { countsFor, planWorkbook, plansMatch, previewOrder, sheetPlans, survivingOverrides, tickedKeys, unmetNeeds, untickedCounts } from './planWorkbook';
import { CatalogSnapshot, isApplicable, PlanRow, RawWorkbook, SHEET_TITLES, SheetKey } from './types';
import { apolloWorkbookMutator, loadCatalogSnapshot } from './workbookCatalog';

export interface WorkbookUploadPreviewProps {
  raw: RawWorkbook;
  catalog: CatalogSnapshot;
  fileName: string;
  /** Whether the caller holds internal-fields:read. */
  allowPricing: boolean;
  onClose: () => void;
  onComplete: (summary: ApplySummary) => void;
}

const ACTION_COLOR: Record<PlanRow['action'], 'success' | 'info' | 'warning' | 'default'> = { create: 'success', update: 'info', hide: 'warning', unchanged: 'default', skip: 'default' };

/**
 * The upload preview: one tab per recognised sheet with create / update / skip
 * counts, per-row errors and warnings, and a tick-box per row. Only ticked rows
 * are applied. Ignored sheets and columns are named, never silently dropped.
 */
export function WorkbookUploadPreview({ raw, catalog: openedWith, fileName, allowPricing, onClose, onComplete }: WorkbookUploadPreviewProps) {
  const client = useApolloClient();
  const { userProps } = useContext(UserContext);
  // The catalog the plan is made against. Import re-loads it; see handleImport.
  const [catalog, setCatalog] = useState<CatalogSnapshot>(openedWith);
  const [notice, setNotice] = useState<{ severity: 'warning' | 'error'; text: string } | null>(null);
  const [hideMissing, setHideMissing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const plan = useMemo(() => planWorkbook(raw, catalog, { allowPricing, hideMissing }), [raw, catalog, allowPricing, hideMissing]);
  const sheets = sheetPlans(plan);
  const [tab, setTab] = useState<SheetKey>(sheets[0]?.sheet ?? 'operations');
  const ticked = useMemo(() => tickedKeys(plan, overrides), [plan, overrides]);
  const blocked = useMemo(() => unmetNeeds(plan, ticked), [plan, ticked]);
  const current = sheets.find((sheet) => sheet.sheet === tab) ?? sheets[0];
  const toApply = [...ticked].filter((key) => !(key in blocked)).length;
  const ignoredColumns = sheets.filter((sheet) => sheet.ignoredColumns.length > 0);

  const handleImport = async () => {
    setImporting(true);
    setNotice(null);
    const uploaderName = userProps?.idTokenParsed?.name || userProps?.idTokenParsed?.preferred_username || 'unknown';
    let summary: ApplySummary;
    try {
      // The import writes whole lists (a set's parameters, an operation's, a category's members), so it is built from
      // the catalog as it is now, never as it was when the file was chosen. If that changes what the preview said would
      // happen, nothing is applied: the person sees the new plan first.
      let fresh: CatalogSnapshot;
      try {
        fresh = await loadCatalogSnapshot(client);
      } catch (error) {
        setNotice({ severity: 'error', text: `Could not re-check the catalog, so nothing was imported: ${formatGqlError(error)}` });
        setImporting(false);
        return;
      }
      const replanned = planWorkbook(raw, fresh, { allowPricing, hideMissing });
      if (!plansMatch(plan, replanned)) {
        setCatalog(fresh);
        setOverrides((prev) => survivingOverrides(prev, replanned));
        setNotice({ severity: 'warning', text: 'The catalog changed while this preview was open, so nothing was imported. The preview now shows what would happen against the current catalog. Check it, then import again.' });
        setImporting(false);
        return;
      }
      summary = await applyWorkbook(replanned, ticked, fresh, apolloWorkbookMutator(client), {
        fileName,
        uploaderName,
        uploaderSub: userProps?.subject,
        onProgress: (done, total) => setProgress(total === 0 ? 100 : Math.round((done / total) * 100))
      });
    } catch (error) {
      // applyWorkbook reports row and log failures in its summary; this is anything it did not catch.
      // Hand the parent a stopped summary so it closes the dialog, shows the message and refreshes the
      // catalog (some rows may already have been written).
      summary = stoppedSummary(error);
    } finally {
      setImporting(false);
    }
    onComplete(summary);
  };

  const columns: GridColDef<PlanRow>[] = [
    {
      field: 'include', headerName: '', width: 50, sortable: false,
      renderCell: (p) => (
        <Checkbox
          size='small'
          disabled={importing || !isApplicable(p.row)}
          checked={ticked.has(p.row.key)}
          onChange={(event) => setOverrides((prev) => ({ ...prev, [p.row.key]: event.target.checked }))}
        />
      )
    },
    { field: 'rowNumber', headerName: 'Row', width: 70, valueGetter: (_v, row) => row.rowNumber ?? '—' },
    { field: 'label', headerName: 'Name', width: 260, flex: 1 },
    {
      field: 'action', headerName: 'Action', width: 210, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          <Chip size='small' color={ACTION_COLOR[p.row.action]} label={p.row.action} />
        </Box>
      )
    },
    { field: 'changed', headerName: 'Changes', width: 200, sortable: false, valueGetter: (_v, row) => row.changed.join(', ') },
    {
      field: 'messages', headerName: 'Errors / warnings', width: 380, flex: 1, sortable: false,
      renderCell: (p) => {
        const problems = [...p.row.errors, ...(p.row.key in blocked ? [blocked[p.row.key]] : [])];
        return (
          <Typography variant='caption' color={problems.length ? 'error.main' : 'warning.main'} sx={{ whiteSpace: 'normal' }}>
            {[...problems, ...p.row.warnings].join('; ')}
          </Typography>
        );
      }
    }
  ];

  const counts = current ? countsFor(current.rows, ticked, blocked) : { create: 0, update: 0, hide: 0, skip: 0 };
  const unticked = current ? untickedCounts(current.rows, ticked) : { create: 0, update: 0, hide: 0 };
  // The rows that matter first; unchanged ones last. A person approving a bulk write must meet every error and every create.
  const orderedRows = useMemo(() => (current ? previewOrder(current.rows, blocked) : []), [current, blocked]);

  return (
    <Dialog open onClose={importing ? undefined : onClose} maxWidth='xl' fullWidth>
      <DialogTitle>Upload workbook — preview</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            {fileName}. Nothing is changed until you import, and nothing is ever deleted: records and parameters the workbook does not mention are left as they are.
          </Typography>
          {notice && <Alert severity={notice.severity}>{notice.text}</Alert>}
          {(plan.ignoredSheets.length > 0 || ignoredColumns.length > 0) && (
            <Alert severity='info'>
              {plan.ignoredSheets.length > 0 && <div>Ignored sheets: {plan.ignoredSheets.join(', ')}</div>}
              {ignoredColumns.map((sheet) => (
                <div key={sheet.sheet}>Ignored columns on {SHEET_TITLES[sheet.sheet]}: {sheet.ignoredColumns.join(', ')}</div>
              ))}
            </Alert>
          )}
          <Tabs value={current?.sheet ?? false} onChange={(_event, value: SheetKey) => setTab(value)}>
            {sheets.map((sheet) => {
              const c = countsFor(sheet.rows, ticked, blocked);
              const u = untickedCounts(sheet.rows, ticked);
              const notTicked = u.create + u.update + u.hide;
              return <Tab key={sheet.sheet} value={sheet.sheet} label={`${SHEET_TITLES[sheet.sheet]} (${c.create + c.update + c.hide}${notTicked > 0 ? `, ${notTicked} not ticked` : ''})`} />;
            })}
          </Tabs>
          {current && (
            <>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={`${current.rowCount} rows`} />
                <Chip label={`${counts.create} to create`} color='success' variant='outlined' />
                <Chip label={`${counts.update} to update`} color='info' variant='outlined' />
                {counts.hide > 0 && <Chip label={`${counts.hide} to hide`} color='warning' variant='outlined' />}
                {unticked.create > 0 && <Chip label={`${unticked.create} create${unticked.create === 1 ? '' : 's'} not ticked`} color='warning' />}
                {unticked.update > 0 && <Chip label={`${unticked.update} update${unticked.update === 1 ? '' : 's'} not ticked`} color='warning' />}
                {unticked.hide > 0 && <Chip label={`${unticked.hide} hide${unticked.hide === 1 ? '' : 's'} not ticked`} color='warning' />}
                <Chip label={`${counts.skip} to skip`} variant='outlined' />
                {current.sheet === 'operations' && (
                  <FormControlLabel
                    label='Hide operations not in this sheet from clients'
                    control={<Checkbox size='small' disabled={importing} checked={hideMissing} onChange={(event) => setHideMissing(event.target.checked)} />}
                  />
                )}
              </Box>
              {importing && <LinearProgress variant='determinate' value={progress} />}
              <Box sx={{ height: 440 }}>
                <DataGrid rows={orderedRows} columns={columns} getRowId={(row) => row.key} density='compact' getRowHeight={() => 'auto'} disableRowSelectionOnClick />
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>Cancel</Button>
        <Button variant='contained' onClick={handleImport} disabled={importing || toApply === 0}>
          {importing ? 'Importing…' : `Import ${toApply} row${toApply === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
