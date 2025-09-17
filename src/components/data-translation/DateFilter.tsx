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
import { formatDateForDisplay } from './utils';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

export interface DateFilterCriteria {
  column: string;
  operator: 'before' | 'after' | 'between';
  startDate: string;
  endDate?: string;
}

interface DateFilterProps {
  dateColumns: string[]; // Array of column names that contain dates
  onFilterChange: (filters: DateFilterCriteria[]) => void;
  currentFilters: DateFilterCriteria[];
}

export default function DateFilter({ dateColumns, onFilterChange, currentFilters }: DateFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<DateFilterCriteria>>({
    column: '',
    operator: 'after',
    startDate: '',
    endDate: ''
  });

  const handleAddFilter = () => {
    if (!newFilter.column || !newFilter.startDate) return;

    const filter: DateFilterCriteria = {
      column: newFilter.column,
      operator: newFilter.operator || 'after',
      startDate: newFilter.startDate,
      ...(newFilter.operator === 'between' && newFilter.endDate ? { endDate: newFilter.endDate } : {})
    };

    onFilterChange([...currentFilters, filter]);
    
    // Reset form
    setNewFilter({
      column: '',
      operator: 'after',
      startDate: '',
      endDate: ''
    });
  };

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = currentFilters.filter((_, i) => i !== index);
    onFilterChange(updatedFilters);
  };

  const handleClearAllFilters = () => {
    onFilterChange([]);
  };

  const formatFilterLabel = (filter: DateFilterCriteria) => {
    const columnName = filter.column;
    const startDate = formatDateForDisplay(filter.startDate);
    
    switch (filter.operator) {
      case 'before':
        return `${columnName} before ${startDate}`;
      case 'after':
        return `${columnName} after ${startDate}`;
      case 'between':
        const endDate = filter.endDate ? formatDateForDisplay(filter.endDate) : '';
        return `${columnName} between ${startDate} and ${endDate}`;
      default:
        return `${columnName} filter`;
    }
  };

  if (dateColumns.length === 0) return null;

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="primary" />
          <Typography variant="h6">Date Filters</Typography>
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
                {dateColumns.map((column) => (
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
                  setNewFilter(prev => ({ ...prev, operator: e.target.value as DateFilterCriteria['operator'] }))
                }
              >
                <MenuItem value="before">Before</MenuItem>
                <MenuItem value="after">After</MenuItem>
                <MenuItem value="between">Between</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="caption" gutterBottom display="block">
                {newFilter.operator === 'between' ? 'Start Date' : 'Date'}
              </Typography>
              <TextField
                type="date"
                size="small"
                value={newFilter.startDate || ''}
                onChange={(e) => 
                  setNewFilter(prev => ({ ...prev, startDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {newFilter.operator === 'between' && (
              <Box>
                <Typography variant="caption" gutterBottom display="block">
                  End Date
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={newFilter.endDate || ''}
                  onChange={(e) => 
                    setNewFilter(prev => ({ ...prev, endDate: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={handleAddFilter}
              disabled={!newFilter.column || !newFilter.startDate || 
                (newFilter.operator === 'between' && !newFilter.endDate)}
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
