import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import UploadIcon from '@mui/icons-material/Upload';
import { useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppContext } from '../../../contexts/App';
import { PERMISSIONS, usePermissions } from '../../../hooks/usePermissions';
import { formatGqlError } from '../../../utils/gqlError';
import { isExcelFileName } from '../inventoryUploadUtils';
import type { EditTypes } from '../ToolBar';
import { ApplySummary, summaryText } from './applyWorkbook';
import { readWorkbookFile } from './readWorkbook';
import { CatalogSnapshot, RawWorkbook } from './types';
import { workbookAccess } from './workbookAccess';
import { loadCatalogSnapshot } from './workbookCatalog';
import { WorkbookUploadPreview } from './WorkbookUploadPreview';
import { buildWorkbookData, WORKBOOK_FILE_NAME, writeWorkbook } from './writeWorkbook';

export interface WorkbookMessage {
  severity: 'success' | 'warning' | 'error';
  text: string;
}

/**
 * "Download workbook" / "Upload workbook" for the Catalog Editor's Services,
 * Parameter Sets, Categories, Bundles and SOWs views. One workbook, whichever
 * view you are on: its sheets reference each other.
 */
export function WorkbookButtons({ editType, onMessage }: { editType: EditTypes; onMessage: (message: WorkbookMessage) => void }) {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { refreshCatalog } = useContext(AppContext);
  const access = workbookAccess(editType, can);
  const allowPricing = can(PERMISSIONS.InternalFieldsRead);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'download' | 'upload' | null>(null);
  const [upload, setUpload] = useState<{ raw: RawWorkbook; catalog: CatalogSnapshot; fileName: string } | null>(null);

  if (!access.show) return null;

  const handleDownload = async () => {
    setBusy('download');
    try {
      const catalog = await loadCatalogSnapshot(client);
      const buffer = await writeWorkbook(buildWorkbookData(catalog, { includePricing: allowPricing }));
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = WORKBOOK_FILE_NAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      onMessage({ severity: 'error', text: `Could not download the workbook: ${formatGqlError(error)}` });
    } finally {
      setBusy(null);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isExcelFileName(file.name)) {
      onMessage({ severity: 'error', text: 'Please upload an .xlsx or .xls file.' });
      return;
    }
    setBusy('upload');
    try {
      const raw = await readWorkbookFile(file);
      if (Object.keys(raw.sheets).length === 0) {
        onMessage({ severity: 'error', text: 'No Operations, Parameter List, Bundles or SOW Sections sheet was found in that workbook.' });
        return;
      }
      // Classified against the catalog as it is right now, never against what the page happened to have loaded.
      setUpload({ raw, catalog: await loadCatalogSnapshot(client), fileName: file.name });
    } catch (error) {
      onMessage({ severity: 'error', text: `Could not read the workbook: ${formatGqlError(error, 'the file could not be read.')}` });
    } finally {
      setBusy(null);
    }
  };

  const handleComplete = async (summary: ApplySummary) => {
    setUpload(null);
    const failed = Object.values(summary.rowErrors);
    const text = failed.length > 0 ? `${summaryText(summary)} ${failed.length} row${failed.length === 1 ? '' : 's'} failed: ${failed.join(' ')}` : summaryText(summary);
    onMessage({ severity: failed.length > 0 || summary.errors.length > 0 ? 'warning' : 'success', text });
    await refreshCatalog();
    await client.refetchQueries({ include: 'active' });
  };

  return (
    <>
      {access.download && (
        <Button variant='outlined' startIcon={<DownloadIcon />} disabled={busy !== null} onClick={handleDownload}>
          {busy === 'download' ? 'Preparing…' : 'Download workbook'}
        </Button>
      )}
      {access.upload && (
        <>
          <Button variant='contained' startIcon={<UploadIcon />} disabled={busy !== null} onClick={() => fileInput.current?.click()}>
            {busy === 'upload' ? 'Reading…' : 'Upload workbook'}
          </Button>
          <input ref={fileInput} type='file' accept='.xlsx,.xls' style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}
      <Button variant='outlined' startIcon={<HistoryIcon />} onClick={() => navigate('/edit/inventory/upload-history')}>
        Upload history
      </Button>
      {upload && (
        <WorkbookUploadPreview
          raw={upload.raw}
          catalog={upload.catalog}
          fileName={upload.fileName}
          allowPricing={allowPricing}
          onClose={() => setUpload(null)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
