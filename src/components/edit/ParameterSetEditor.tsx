import { useMemo, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router';
import ParameterListEditor from './parameters/ParameterListEditor';
import { EditableParameter, withDragKeys } from './parameters/parameterSave';
import { ReadOnlyFieldset } from '../ReadOnlyFieldset';
import { lockedDragKeys, parameterSetPayload } from './parameterSetForm';

export interface ParameterSetEditorProps {
  initial?: { name: string; description?: string | null; parameters: any[] };
  /** True on the edit page: parameters loaded from the server keep their id (pin 2). */
  lockSavedIds: boolean;
  canWrite: boolean;
  saving: boolean;
  saveLabel: string;
  onSave: (payload: { name: string; description: string | null; parameters: any[] }) => void;
  extraActions?: React.ReactNode;
  errorMessage?: string | null;
}

/** Shared by AdminNewParameterSet and AdminEditParameterSet (pins 1, 2, 8). */
export default function ParameterSetEditor({
  initial,
  lockSavedIds,
  canWrite,
  saving,
  saveLabel,
  onSave,
  extraActions,
  errorMessage
}: ParameterSetEditorProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [parameters, setParameters] = useState<EditableParameter[]>(() => withDragKeys(initial?.parameters ?? []));
  const [tableDataText, setTableDataText] = useState<Record<number, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  // Computed once from what was loaded: a parameter added in this session is not locked yet.
  const locked = useMemo(() => (lockSavedIds ? lockedDragKeys(parameters) : new Set<string>()), []); // eslint-disable-line react-hooks/exhaustive-deps
  const isIdLocked = (p: EditableParameter) => locked.has(p._dragKey);

  const handleSave = () => {
    // Same predicate passed to ParameterListEditor below, so a new parameter
    // colliding with a saved id is the one renamed — never the saved one (C4).
    const { payload, errors } = parameterSetPayload({ name, description, parameters, tableDataText, isIdLocked });
    if (!payload) {
      setLocalError(errors.join(' '));
      return;
    }
    setLocalError(null);
    onSave(payload);
  };

  const shownError = localError ?? errorMessage;

  return (
    <Stack spacing={3}>
      {!!shownError && <Alert severity='error'>{shownError}</Alert>}
      <ReadOnlyFieldset canWrite={canWrite} noun='the service catalog'>
        <Stack spacing={2}>
          <TextField label='Name' required value={name} onChange={(e) => setName(e.target.value)} sx={{ maxWidth: 480 }} />
          <TextField label='Description' multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} sx={{ maxWidth: 720 }} />
          <ParameterListEditor
            parameters={parameters}
            setParameters={setParameters}
            tableDataText={tableDataText}
            setTableDataText={setTableDataText}
            canWrite={canWrite}
            isIdLocked={isIdLocked}
          />
        </Stack>
      </ReadOnlyFieldset>
      {/* Outside the fieldset — see ReadOnlyFieldset. */}
      <Stack direction='row' spacing={2}>
        <Button variant='outlined' disabled={saving} onClick={() => navigate('/edit', { state: { editType: 'Parameter Sets' } })}>
          {canWrite ? 'Cancel' : 'Back to catalog'}
        </Button>
        {canWrite && (
          <Button variant='contained' disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : saveLabel}
          </Button>
        )}
        {extraActions}
      </Stack>
    </Stack>
  );
}
