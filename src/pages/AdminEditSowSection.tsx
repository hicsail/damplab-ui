import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GET_SOW_PRESET_SECTIONS, GET_SOW_TEXT_PRESETS } from '../gql/queries';
import { CREATE_SOW_TEXT_PRESET, DELETE_SOW_TEXT_PRESET, REORDER_SOW_TEXT_PRESETS, UPDATE_SOW_TEXT_PRESET } from '../gql/mutations';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

/**
 * One prose section's library of text blocks.
 *
 * The block at the top is the section's default — what a newly generated SOW is
 * written with. That is the whole meaning of the order, which is why the list is
 * dragged rather than given a "make default" button: there is one arrangement to
 * read and one to change.
 *
 * Editing a block here never reaches into a SOW that already quoted it. A SOW
 * copies the words when it is generated, or when a staff member picks a block in
 * the editor, and keeps its own copy from then on.
 */

export interface SowTextPreset {
  id: string;
  sectionKey: string;
  name: string;
  text: string;
  order: number;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

export function formatBlockEdited(preset: Pick<SowTextPreset, 'updatedAt' | 'updatedByName'>): string {
  if (!preset.updatedAt) return 'Never edited';
  const when = new Date(preset.updatedAt).toLocaleDateString();
  return preset.updatedByName ? `Edited ${when} by ${preset.updatedByName}` : `Edited ${when}`;
}

function firstLine(text: string): string {
  return (text || '').split('\n').find((l) => l.trim() !== '')?.replace(/^-\s*/, '') ?? '';
}

interface BlockCardProps {
  preset: SowTextPreset;
  isDefault: boolean;
  busy: boolean;
  onSave: (id: string, changes: { name: string; text: string }) => Promise<void>;
  onDelete: (preset: SowTextPreset) => void;
  /** Passed down rather than resolved here — see GridToolBarProps.canWrite. */
  canWrite: boolean;
}

function BlockCard({ preset, isDefault, busy, onSave, onDelete, canWrite }: BlockCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: preset.id, disabled: busy });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(preset.name);
  const [text, setText] = useState(preset.text);

  // A block edited elsewhere (another tab, a refetch) should show its new content
  // — but not while this card is mid-edit, which would discard what was typed.
  useEffect(() => {
    if (editing) return;
    setName(preset.name);
    setText(preset.text);
  }, [preset.name, preset.text, editing]);

  const save = async (): Promise<void> => {
    await onSave(preset.id, { name, text });
    setEditing(false);
  };

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        bgcolor: isDragging ? 'action.hover' : undefined,
        borderLeft: '3px solid',
        borderLeftColor: isDefault ? 'primary.main' : 'transparent'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* The handle is the only listener surface, so the fields beside it keep
            their own pointer behaviour (text selection, caret placement). */}
        <Box
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${preset.name}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: busy ? 'text.disabled' : 'text.secondary',
            cursor: busy ? 'default' : 'grab',
            touchAction: 'none',
            '&:active': { cursor: busy ? 'default' : 'grabbing' }
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <TextField size="small" label="Block name" fullWidth sx={{ maxWidth: 360 }} value={name} onChange={(e) => setName(e.target.value)} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {preset.name}
              </Typography>
              {isDefault && <Chip size="small" color="primary" label="Default" />}
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {formatBlockEdited(preset)}
          </Typography>
        </Box>

        {!canWrite ? null : editing ? (
          <Tooltip title="Save this block">
            <span>
              <IconButton size="small" color="primary" disabled={busy} aria-label={`Save ${preset.name}`} onClick={() => void save()}>
                <SaveOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="Edit this block's name and text">
            <span>
              <IconButton size="small" disabled={busy} aria-label={`Edit ${preset.name}`} onClick={() => setEditing(true)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {canWrite && (
          <Tooltip title="Delete this block">
            <span>
              <IconButton size="small" disabled={busy} aria-label={`Delete ${preset.name}`} onClick={() => onDelete(preset)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ mt: 1.5, pl: 4 }}>
        {editing ? (
          <TextField
            multiline
            fullWidth
            minRows={5}
            value={text}
            helperText="Plain text. A line beginning with “- ” becomes a bullet."
            onChange={(e) => setText(e.target.value)}
          />
        ) : (
          <Typography variant="body2" color={preset.text ? 'text.secondary' : 'text.disabled'} noWrap>
            {firstLine(preset.text) || 'This block is empty.'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function AdminEditSowSection(): React.JSX.Element {
  const { sectionKey = '' } = useParams();
  const client = useApolloClient();

  const { data: sectionsData } = useQuery(GET_SOW_PRESET_SECTIONS);
  const { data, loading, refetch } = useQuery(GET_SOW_TEXT_PRESETS, { variables: { sectionKey }, fetchPolicy: 'cache-and-network' });

  const [presets, setPresets] = useState<SowTextPreset[]>([]);
  const [busy, setBusy] = useState(false);
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.CatalogEditorWrite);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SowTextPreset | null>(null);

  useEffect(() => {
    setPresets(data?.sowTextPresets ?? []);
  }, [data]);

  const label = useMemo(
    () => (sectionsData?.sowPresetSections ?? []).find((s: { key: string }) => s.key === sectionKey)?.label ?? sectionKey,
    [sectionsData, sectionKey]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  /** Every mutation goes through here so one failure story covers all of them. */
  const run = useCallback(
    async (work: () => Promise<unknown>): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        await work();
        await refetch();
      } catch (e) {
        console.error('SOW section edit failed:', e);
        setError(formatSaveError(e, 'this text block'));
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [refetch]
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = presets.findIndex((p) => p.id === active.id);
    const to = presets.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;

    // Move locally first: the drop should land where it was dropped, rather than
    // snapping back until the server answers.
    const next = arrayMove(presets, from, to);
    setPresets(next);
    void run(() =>
      client.mutate({ mutation: REORDER_SOW_TEXT_PRESETS, variables: { order: { sectionKey, orderedIds: next.map((p) => p.id) } } })
    );
  };

  const handleSave = async (id: string, changes: { name: string; text: string }): Promise<void> => {
    await run(() => client.mutate({ mutation: UPDATE_SOW_TEXT_PRESET, variables: { id, changes } }));
  };

  const handleCreate = (): void => {
    void run(() =>
      client.mutate({ mutation: CREATE_SOW_TEXT_PRESET, variables: { preset: { sectionKey, name: 'New text block', text: '' } } })
    );
  };

  const confirmDelete = (): void => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    void run(() => client.mutate({ mutation: DELETE_SOW_TEXT_PRESET, variables: { id: target.id } }));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2">{label}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Text blocks staff can choose from for this section. The one at the top is the default: it is what a newly generated SOW is written
          with. Editing a block here does not change any SOW that already exists.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!canWrite && (
        <Alert severity="info">
          You have read-only access to the service catalog. These text blocks are shown for
          reference and cannot be edited.
        </Alert>
      )}

      {loading && presets.length === 0 ? (
        <CircularProgress />
      ) : presets.length === 0 ? (
        <Alert severity="info">
          This section has no text blocks yet, so SOWs fall back to its built-in wording. Add one to make it editable here.
        </Alert>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {presets.map((preset, i) => (
              <BlockCard key={preset.id} preset={preset} isDefault={i === 0} busy={busy} onSave={handleSave} onDelete={setPendingDelete} canWrite={canWrite} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {canWrite && (
        <Box>
          <Button startIcon={<AddIcon />} disabled={busy} onClick={handleCreate}>
            New text block preset
          </Button>
        </Box>
      )}

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete “{pendingDelete?.name}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the block from the {label} library. SOWs already written with it keep their text — they hold their own copy.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
