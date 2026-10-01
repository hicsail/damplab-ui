import { FormControlLabel, Switch } from '@mui/material';

export function ShowHiddenOperationsToggle({ showHidden, setShowHidden }: { showHidden: boolean; setShowHidden: (v: boolean) => void }) {
  return <FormControlLabel control={<Switch size='small' checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />} label='Show hidden ops' />;
}
