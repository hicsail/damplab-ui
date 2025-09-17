import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton,
  Collapse,
  SelectChangeEvent,
  Chip,
  Stack
} from '@mui/material';
import { formatTimeForDisplay } from './utils';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

export interface TimeFilterCriteria {
  column: string;
  operator: 'before' | 'after' | 'between';
  startTime: string;
  endTime?: string;
}

interface TimeFilterProps {
  timeColumns: string[]; // Array of column names that contain times
  onFilterChange: (filters: TimeFilterCriteria[]) => void;
  currentFilters: TimeFilterCriteria[];
}

export default function TimeFilter({ timeColumns, onFilterChange, currentFilters }: TimeFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<TimeFilterCriteria>>({
    column: '',
    operator: 'after',
    startTime: '',
    endTime: ''
  });

  const handleAddFilter = () => {
    if (!newFilter.column || !newFilter.startTime) return;

    const filter: TimeFilterCriteria = {
      column: newFilter.column,
      operator: newFilter.operator || 'after',
      startTime: newFilter.startTime,
      ...(newFilter.operator === 'between' && newFilter.endTime ? { endTime: newFilter.endTime } : {})
    };

    onFilterChange([...currentFilters, filter]);
    
    // Reset form
    setNewFilter({
      column: '',
      operator: 'after',
      startTime: '',
      endTime: ''
    });
  };

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = currentFilters.filter((_, i) => i !== index);
    onFilterChange(updatedFilters);
  };

  const handleClearAllFilters = () => {
    onFilterChange([]);
  };

  const formatFilterLabel = (filter: TimeFilterCriteria) => {
    const columnName = filter.column;
    const startTime = formatTimeForDisplay(filter.startTime);
    
    switch (filter.operator) {
      case 'before':
        return `${columnName} before ${startTime}`;
      case 'after':
        return `${columnName} after ${startTime}`;
      case 'between':
        const endTime = filter.endTime ? formatTimeForDisplay(filter.endTime) : '';
        return `${columnName} between ${startTime} and ${endTime}`;
      default:
        return `${columnName} filter`;
    }
  };

  if (timeColumns.length === 0) return null;

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon color="primary" />
          <Typography variant="h6">Time Filters</Typography>
          {currentFilters.length > 0 && (
            <Chip 
              label={`${currentFilters.length} active`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentFilters.length > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAllFilters}
              color="secondary"
            >
              Clear All
            </Button>
          )}
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {/* Active Filters */}
          {currentFilters.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Active Filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {currentFilters.map((filter, index) => (
                  <Chip
                    key={index}
                    label={formatFilterLabel(filter)}
                    onDelete={() => handleRemoveFilter(index)}
                    color="primary"
                    variant="filled"
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Add New Filter */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Typography variant="caption" gutterBottom>
                Column
              </Typography>
              <Select
                value={newFilter.column || ''}
                onChange={(e: SelectChangeEvent) => 
                  setNewFilter(prev => ({ ...prev, column: e.target.value }))
                }
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select column</em>
                </MenuItem>
                {timeColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Typography variant="caption" gutterBottom>
                Condition
              </Typography>
              <Select
                value={newFilter.operator || 'after'}
                onChange={(e: SelectChangeEvent) => 
                  setNewFilter(prev => ({ ...prev, operator: e.target.value as TimeFilterCriteria['operator'] }))
                }
              >
                <MenuItem value="before">Before</MenuItem>
                <MenuItem value="after">After</MenuItem>
                <MenuItem value="between">Between</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="caption" gutterBottom display="block">
                {newFilter.operator === 'between' ? 'Start Time' : 'Time'}
              </Typography>
              <TextField
                type="time"
                size="small"
                value={newFilter.startTime || ''}
                onChange={(e) => 
                  setNewFilter(prev => ({ ...prev, startTime: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {newFilter.operator === 'between' && (
              <Box>
                <Typography variant="caption" gutterBottom display="block">
                  End Time
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  value={newFilter.endTime || ''}
                  onChange={(e) => 
                    setNewFilter(prev => ({ ...prev, endTime: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={handleAddFilter}
              disabled={!newFilter.column || !newFilter.startTime || 
                (newFilter.operator === 'between' && !newFilter.endTime)}
              size="small"
            >
              Add Filter
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
