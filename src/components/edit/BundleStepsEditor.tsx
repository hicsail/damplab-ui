import { Box, Button, IconButton, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import { BundleStep, addStep, moveStep, removeStep, setStepService } from './bundleSteps';

/**
 * The steps that make up a bundle: add a step, then choose the operation that
 * fills it.
 *
 * This replaces a multi-select of checkboxes paired with a separate reorder
 * list. Two controls for one idea was already awkward; worse, a checkbox set
 * cannot say "this operation runs twice", so a bundle could never describe a
 * sequence that revisits an operation.
 *
 * Shared by the new-bundle and edit-bundle pages, which were otherwise
 * near-duplicates. The edit page wraps it in a ReadOnlyFieldset, so `disabled`
 * here is only for the in-flight save.
 */
interface Props {
  steps: BundleStep[];
  onChange: (steps: BundleStep[]) => void;
  availableServices: ReadonlyArray<{ id: string; name: string }>;
  disabled?: boolean;
}

export default function BundleStepsEditor({ steps, onChange, availableServices, disabled }: Props) {
  return (
    <Box>
      <Typography variant='subtitle1' sx={{ mb: 1 }}>
        Steps in this bundle
      </Typography>
      <Paper variant='outlined' sx={{ p: 1.5 }}>
        {steps.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
            No steps yet. Add one, then choose the operation it runs.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {steps.map((step, index) => (
              <Box
                key={step.key}
                sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 1, alignItems: 'center' }}
              >
                <Typography variant='body2' color='text.secondary' sx={{ minWidth: 56 }}>
                  Step {index + 1}
                </Typography>
                <Select
                  size='small'
                  fullWidth
                  displayEmpty
                  disabled={disabled}
                  value={step.serviceId}
                  onChange={(event) => onChange(setStepService(steps, index, String(event.target.value)))}
                  inputProps={{ 'aria-label': `Operation for step ${index + 1}` }}
                  renderValue={(value) =>
                    value ? (
                      availableServices.find((service) => service.id === value)?.name ?? String(value)
                    ) : (
                      <Typography component='span' variant='body2' color='text.secondary'>
                        Select an operation
                      </Typography>
                    )
                  }
                  MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                >
                  {availableServices.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Select>
                <IconButton
                  size='small'
                  aria-label={`Move step ${index + 1} up`}
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveStep(steps, index, -1))}
                >
                  <ArrowUpwardIcon fontSize='small' />
                </IconButton>
                <IconButton
                  size='small'
                  aria-label={`Move step ${index + 1} down`}
                  disabled={disabled || index === steps.length - 1}
                  onClick={() => onChange(moveStep(steps, index, 1))}
                >
                  <ArrowDownwardIcon fontSize='small' />
                </IconButton>
                <IconButton
                  size='small'
                  color='error'
                  aria-label={`Remove step ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange(removeStep(steps, index))}
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
        <Button size='small' startIcon={<AddIcon />} disabled={disabled} onClick={() => onChange(addStep(steps))}>
          Add step
        </Button>
      </Paper>
    </Box>
  );
}
