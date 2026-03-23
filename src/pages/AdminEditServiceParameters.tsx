import { useApolloClient } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppContext } from '../contexts/App';
import { UPDATE_SERVICE } from '../gql/queries';
import { validateParameter } from '../components/edit/parameters/ParameterValidation';

const TYPE_OPTIONS = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'File upload' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'dropdown', label: 'Pick from list' },
  { value: 'table', label: 'Table' }
];

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AdminEditServiceParameters() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { services, refreshCatalog } = useContext(AppContext);

  const service = useMemo(
    () => services.find((entry: any) => String(entry.id) === String(serviceId)),
    [serviceId, services]
  );

  const [parameters, setParameters] = useState<any[]>(service?.parameters ?? []);
  const [tableDataText, setTableDataText] = useState<Record<number, string>>({});
  const [selectedParameterIndex, setSelectedParameterIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!service) {
    return <Alert severity='error'>Service not found.</Alert>;
  }

  const updateParameter = (index: number, patch: Record<string, any>) => {
    setParameters((prev) =>
      prev.map((param, i) => (i === index ? { ...param, ...patch } : param))
    );
  };

  const removeParameter = (index: number) => {
    setParameters((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setSelectedParameterIndex((current) => {
        if (next.length === 0) return 0;
        if (current > index) return current - 1;
        if (current === index) return Math.max(0, current - 1);
        return current;
      });
      return next;
    });
  };

  const addParameter = () => {
    setParameters((prev) => {
      const next = [
        ...prev,
        {
          id: '',
          name: '',
          description: '',
          type: 'string',
          paramType: 'input',
          required: false,
          allowMultipleValues: false,
          isPriceMultiplier: false
        }
      ];
      setSelectedParameterIndex(next.length - 1);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setErrorMessage(null);

      const tableParseErrors: string[] = [];
      const normalizedParameters = parameters.map((parameter, index) => {
        const normalized = { ...parameter };
        if (normalized.type === 'table') {
          const raw = tableDataText[index];
          if (raw && raw.trim()) {
            try {
              normalized.tableData = JSON.parse(raw);
            } catch (_error) {
              tableParseErrors.push(`Parameter ${index + 1} table setup must be valid JSON.`);
            }
          }
        }
        return normalized;
      });

      const validationErrors = normalizedParameters.flatMap((parameter, index) =>
        validateParameter(parameter).map((error) => `Parameter ${index + 1}: ${error.field} - ${error.errorMsg}`)
      );

      if (tableParseErrors.length > 0 || validationErrors.length > 0) {
        setErrorMessage([...tableParseErrors, ...validationErrors].join(' '));
        return;
      }

      setIsSaving(true);
      await client.mutate({
        mutation: UPDATE_SERVICE,
        variables: {
          service: service.id,
          changes: {
            parameters: normalizedParameters
          }
        }
      });
      await refreshCatalog();
      navigate('/edit');
    } catch (error) {
      setErrorMessage('Unable to save parameter changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedParameter = parameters[selectedParameterIndex];

  return (
    <Stack spacing={3}>
      <Typography variant='h2'>Full parameter editor</Typography>
      <Typography variant='h5'>{service.name}</Typography>
      <Typography variant='body1' color='text.secondary'>
        Edit each parameter using a form layout with clear fields.
      </Typography>

      {!!errorMessage && <Alert severity='error'>{errorMessage}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}>
        <Paper variant='outlined' sx={{ p: 1, maxHeight: { md: '70vh' }, overflow: 'auto' }}>
          <Stack spacing={1}>
            <Typography variant='subtitle1' sx={{ px: 1, pt: 1 }}>
              Parameters
            </Typography>
            <List dense disablePadding>
              {parameters.map((parameter, index) => (
                <ListItemButton
                  key={`${parameter.id || 'param'}-${index}`}
                  selected={selectedParameterIndex === index}
                  onClick={() => setSelectedParameterIndex(index)}
                >
                  <ListItemText
                    primary={parameter.name?.trim() ? parameter.name : 'Untitled parameter'}
                    secondary={parameter.id ? `ID: ${parameter.id}` : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
            <Box sx={{ p: 1 }}>
              <Button fullWidth variant='outlined' startIcon={<AddIcon />} onClick={addParameter}>
                Add parameter
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper variant='outlined' sx={{ p: 2 }}>
          {!selectedParameter ? (
            <Typography color='text.secondary'>
              No parameters yet. Add a parameter to begin.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Typography variant='h6'>
                  {selectedParameter.name?.trim() ? selectedParameter.name : 'Untitled parameter'}
                </Typography>
                <IconButton
                  aria-label='Remove parameter'
                  onClick={() => removeParameter(selectedParameterIndex)}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label='Internal ID'
                    fullWidth
                    value={selectedParameter.id ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, { id: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label='Name'
                    fullWidth
                    required
                    value={selectedParameter.name ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, { name: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label='Description'
                    fullWidth
                    value={selectedParameter.description ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, { description: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label='Answer format'
                    fullWidth
                    value={selectedParameter.type ?? 'string'}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, { type: event.target.value })
                    }
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label='Required?'
                    fullWidth
                    value={selectedParameter.required ? 'yes' : 'no'}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        required: event.target.value === 'yes'
                      })
                    }
                  >
                    <MenuItem value='yes'>Yes</MenuItem>
                    <MenuItem value='no'>No</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label='Allow multiple selections?'
                    fullWidth
                    value={selectedParameter.allowMultipleValues ? 'yes' : 'no'}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        allowMultipleValues: event.target.value === 'yes'
                      })
                    }
                  >
                    <MenuItem value='yes'>Yes</MenuItem>
                    <MenuItem value='no'>No</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label='Fallback price'
                    type='number'
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    value={selectedParameter.price ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        price: event.target.value === '' ? undefined : Number(event.target.value)
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label='Internal price'
                    type='number'
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    value={selectedParameter.internalPrice ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        internalPrice:
                          event.target.value === '' ? undefined : Number(event.target.value)
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label='External customer (academic)'
                    type='number'
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    value={selectedParameter.externalAcademicPrice ?? selectedParameter.pricing?.externalAcademic ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        externalAcademicPrice:
                          event.target.value === '' ? undefined : Number(event.target.value)
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label='External customer (market)'
                    type='number'
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    value={selectedParameter.externalMarketPrice ?? selectedParameter.pricing?.externalMarket ?? selectedParameter.externalPrice ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        externalMarketPrice:
                          event.target.value === '' ? undefined : Number(event.target.value),
                        externalPrice:
                          event.target.value === '' ? undefined : Number(event.target.value)
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label='External customer (no salary)'
                    type='number'
                    inputProps={{ min: 0, step: '0.01' }}
                    fullWidth
                    value={selectedParameter.externalNoSalaryPrice ?? selectedParameter.pricing?.externalNoSalary ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        externalNoSalaryPrice:
                          event.target.value === '' ? undefined : Number(event.target.value)
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    label='Price note shown to customer'
                    fullWidth
                    value={selectedParameter.pricingExplanation ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        pricingExplanation: event.target.value
                      })
                    }
                  />
                </Grid>

                {(selectedParameter.type === 'string' || selectedParameter.type === 'number') && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label='Starting value'
                      fullWidth
                      type={selectedParameter.type === 'number' ? 'number' : 'text'}
                      value={selectedParameter.defaultValue ?? ''}
                      onChange={(event) =>
                        updateParameter(selectedParameterIndex, {
                          defaultValue:
                            event.target.value === ''
                              ? undefined
                              : selectedParameter.type === 'number'
                                ? Number(event.target.value)
                                : event.target.value
                        })
                      }
                    />
                  </Grid>
                )}

                {selectedParameter.type === 'number' && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        label='Use as price multiplier?'
                        fullWidth
                        helperText='When enabled, this numeric value multiplies the calculated service price.'
                        value={selectedParameter.isPriceMultiplier ? 'yes' : 'no'}
                        onChange={(event) =>
                          updateParameter(selectedParameterIndex, {
                            isPriceMultiplier: event.target.value === 'yes'
                          })
                        }
                      >
                        <MenuItem value='yes'>Yes</MenuItem>
                        <MenuItem value='no'>No</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label='Minimum allowed value'
                        type='number'
                        fullWidth
                        value={selectedParameter.rangeValueMin ?? ''}
                        onChange={(event) =>
                          updateParameter(selectedParameterIndex, {
                            rangeValueMin:
                              event.target.value === '' ? undefined : Number(event.target.value)
                          })
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        label='Maximum allowed value'
                        type='number'
                        fullWidth
                        value={selectedParameter.rangeValueMax ?? ''}
                        onChange={(event) =>
                          updateParameter(selectedParameterIndex, {
                            rangeValueMax:
                              event.target.value === '' ? undefined : Number(event.target.value)
                          })
                        }
                      />
                    </Grid>
                  </>
                )}

                {selectedParameter.type === 'dropdown' && (
                  <Grid size={12}>
                    <Stack spacing={1}>
                      <Typography variant='subtitle1'>Choices</Typography>
                      {(selectedParameter.options ?? []).map((option: any, optionIndex: number) => (
                        <Box
                          key={`${option.id || 'option'}-${optionIndex}`}
                          sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 1 }}
                        >
                          <TextField
                            label='Choice label'
                            value={option.name ?? ''}
                            onChange={(event) => {
                              const nextOptions = [...(selectedParameter.options ?? [])];
                              nextOptions[optionIndex] = {
                                ...nextOptions[optionIndex],
                                id: nextOptions[optionIndex]?.id || createId(),
                                name: event.target.value
                              };
                              updateParameter(selectedParameterIndex, { options: nextOptions });
                            }}
                          />
                          <TextField
                            label='Choice price'
                            type='number'
                            value={option.price ?? ''}
                            onChange={(event) => {
                              const nextOptions = [...(selectedParameter.options ?? [])];
                              nextOptions[optionIndex] = {
                                ...nextOptions[optionIndex],
                                price:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value)
                              };
                              updateParameter(selectedParameterIndex, { options: nextOptions });
                            }}
                          />
                          <TextField
                            label='Market price'
                            type='number'
                            value={option.externalMarketPrice ?? option.pricing?.externalMarket ?? option.externalPrice ?? ''}
                            onChange={(event) => {
                              const nextOptions = [...(selectedParameter.options ?? [])];
                              nextOptions[optionIndex] = {
                                ...nextOptions[optionIndex],
                                externalMarketPrice:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                                externalPrice:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value)
                              };
                              updateParameter(selectedParameterIndex, { options: nextOptions });
                            }}
                          />
                          <IconButton
                            aria-label='Remove choice'
                            onClick={() => {
                              const nextOptions = (selectedParameter.options ?? []).filter(
                                (_: any, i: number) => i !== optionIndex
                              );
                              updateParameter(selectedParameterIndex, { options: nextOptions });
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                      <Box>
                        <Button
                          variant='outlined'
                          size='small'
                          onClick={() =>
                            updateParameter(selectedParameterIndex, {
                              options: [...(selectedParameter.options ?? []), { id: createId(), name: '' }]
                            })
                          }
                        >
                          Add choice
                        </Button>
                      </Box>
                    </Stack>
                  </Grid>
                )}

                {selectedParameter.type === 'table' && (
                  <Grid size={12}>
                    <TextField
                      label='Table setup (JSON)'
                      multiline
                      minRows={6}
                      fullWidth
                      value={
                        tableDataText[selectedParameterIndex] ??
                        (selectedParameter.tableData
                          ? JSON.stringify(selectedParameter.tableData, null, 2)
                          : '')
                      }
                      onChange={(event) =>
                        setTableDataText((prev) => ({
                          ...prev,
                          [selectedParameterIndex]: event.target.value
                        }))
                      }
                    />
                  </Grid>
                )}
              </Grid>
            </Stack>
          )}
        </Paper>
      </Box>

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={() => navigate('/edit')} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save parameter changes'}
        </Button>
      </Stack>
    </Stack>
  );
}
