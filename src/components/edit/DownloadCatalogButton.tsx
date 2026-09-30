import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import * as XLSX from 'xlsx';
import { GET_CATALOG_EXPORT } from '../../gql/queries';
import { formatGqlError } from '../../utils/gqlError';
import { buildCatalogWorkbook, catalogFileBaseName } from './catalogWorkbook';

/** Pin 33: two files, one click. Nothing is stored server-side — the download is the archive. */
export function DownloadCatalogButton({ onError }: { onError: (message: string) => void }) {
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const { data } = await client.query({ query: GET_CATALOG_EXPORT, fetchPolicy: 'network-only' });
      const catalog = data.catalogExport;
      const base = catalogFileBaseName(new Date());
      const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${base}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      XLSX.writeFile(buildCatalogWorkbook(catalog), `${base}.xlsx`);
    } catch (e) {
      onError(`Could not download the catalog: ${formatGqlError(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant='outlined' startIcon={<ArchiveIcon />} onClick={handleClick} disabled={busy}>
      {busy ? 'Preparing…' : 'Download Catalog'}
    </Button>
  );
}
