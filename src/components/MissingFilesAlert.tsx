import { Alert, AlertTitle, Box } from '@mui/material';
import { paramFileLine, type ParamFileRef } from '../utils/missingParamFiles';

interface Props {
  files: ReadonlyArray<ParamFileRef>;
  title: string;
  /** What to do about it, under the list. */
  children: React.ReactNode;
  severity?: 'error' | 'warning';
}

/** Names the files in question. Renders nothing when there are none. */
export default function MissingFilesAlert({ files, title, children, severity = 'error' }: Props) {
  if (files.length === 0) return null;
  return (
    <Alert severity={severity} sx={{ mb: 2, textAlign: 'left' }}>
      <AlertTitle>{title}</AlertTitle>
      <Box component='ul' sx={{ m: 0, pl: 2.5 }}>
        {files.map((file, index) => (
          <li key={index}>{paramFileLine(file)}</li>
        ))}
      </Box>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Alert>
  );
}
