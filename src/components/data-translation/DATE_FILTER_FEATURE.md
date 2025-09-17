# 📅 Date & Time Filtering Feature

## Overview
Added comprehensive date and time filtering capabilities to the DataGrid component, allowing users to filter rows based on date values and time values in separate columns.

## Features

### 🔍 **Smart Date & Time Column Detection**
- **Automatic Detection**: Identifies columns typed as 'date' and time-like columns
- **Content Analysis**: Analyzes column content to detect date-like values (e.g., "02.18.2025") and time-like values (e.g., "11:30")
- **Separate Columns**: Handles date and time data in separate columns independently
- **Multiple Formats**: Supports various date and time formats commonly found in Excel/CSV files

### 📊 **Supported Date Formats**
- `MM.DD.YYYY` (e.g., 02.18.2025)
- `MM/DD/YYYY` (e.g., 02/18/2025)
- `DD.MM.YYYY` (European format)
- `DD/MM/YYYY` (European format)
- `YYYY-MM-DD` (ISO format)
- `MM-DD-YYYY` (US format with dashes)

### 🕐 **Supported Time Formats**
- `HH:MM` (e.g., 11:30, 15:02)
- `H:MM` (e.g., 9:30, 3:02)
- `HH:MM:SS` (e.g., 11:30:45)
- `H:MM:SS` (e.g., 9:30:45)

### 🎛️ **Filter Operations**
1. **Before**: Show rows where date/time is before the specified date/time
2. **After**: Show rows where date/time is after the specified date/time  
3. **Between**: Show rows where date/time falls between two specified dates/times

### ⏰ **Time Filtering Features**
- **Separate Time Filter**: Independent time filtering for time-only columns
- **Time-only Operations**: Filter by time without requiring date information
- **Flexible Comparison**: Handles various time formats and comparisons
- **Combined Filtering**: Apply both date and time filters simultaneously

### 🔧 **User Interface**
- **Dual Filter Panels**: Separate collapsible panels for date and time filtering
- **Visual Indicators**: Shows combined active filter count and affected row count
- **Easy Management**: Add, remove, and clear filters with simple clicks
- **Real-time Filtering**: Results update immediately as filters are applied

## Components

### `DateFilter.tsx`
Date filtering component with:
- Column selection dropdown
- Filter operation selection (before/after/between)
- Date picker inputs
- Active filter management
- Filter chips for easy removal

### `TimeFilter.tsx`
Time filtering component with:
- Column selection dropdown
- Filter operation selection (before/after/between)
- Time picker inputs
- Active filter management
- Filter chips for easy removal

### `utils.ts` - New Functions
- `parseDate()`: Robust date parsing for multiple formats
- `parseTime()`: Robust time parsing for multiple formats
- `getDateColumns()`: Identifies potential date columns
- `getTimeColumns()`: Identifies potential time columns
- `applyDateFilters()`: Applies date filter criteria to data rows
- `applyTimeFilters()`: Applies time filter criteria to data rows
- `isLikelyDateColumn()`: Analyzes content to detect date columns
- `isLikelyTimeColumn()`: Analyzes content to detect time columns
- `createLocalDate()`: Creates dates in local timezone (fixes timezone issues)
- `createLocalTime()`: Creates times in local timezone
- `formatDateForDisplay()`: Consistent date formatting for UI display
- `formatTimeForDisplay()`: Consistent time formatting for UI display

### `DataGridSection.tsx` - Enhanced
- Integrated date and time filter components
- Real-time row filtering with combined date and time filters
- Updated row count display
- Combined filter status indicators

## How It Works

### 1. **Automatic Detection**
```typescript
const dateColumns = useMemo(() => {
  const typedDateColumns = getDateColumns(fileData);
  const potentialDateColumns = fileData.columns
    .filter(col => isLikelyDateColumn(sampleValues))
    .map(col => col.headerName || col.field);
  return [...new Set([...typedDateColumns, ...potentialDateColumns])];
}, [fileData]);
```

### 2. **Smart Date Parsing**
```typescript
export const parseDate = (dateValue: any): Date | null => {
  // Handles multiple formats including MM.DD.YYYY
  const mmddyyyy = dateStr.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})$/);
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1], 10);
    const day = parseInt(mmddyyyy[2], 10);
    const year = parseInt(mmddyyyy[3], 10);
    return new Date(year, month - 1, day);
  }
  // ... other format handling
};
```

### 3. **Real-time Filtering**
```typescript
const filteredRows = useMemo(() => {
  return applyDateFilters(fileData.rows, dateFilters, fileData.columns);
}, [fileData.rows, dateFilters, fileData.columns]);
```

### 4. **Timezone-Safe Date Handling**
```typescript
// Consistent date creation in local timezone
export const createLocalDate = (dateString: string): Date => {
  const parts = dateString.split('-'); // "2025-02-18"
  const year = parseInt(parts[0], 10);   // 2025
  const month = parseInt(parts[1], 10) - 1; // 1 (February, 0-indexed)
  const day = parseInt(parts[2], 10);    // 18
  return new Date(year, month, day);     // Local timezone
};

// Consistent date formatting for UI
export const formatDateForDisplay = (dateString: string): string => {
  const date = createLocalDate(dateString);
  return date.toLocaleDateString('en-US');
};
```

## Usage Example

1. **Upload Excel/CSV** with date and time columns (e.g., containing "02.18.2025" and "11:30")
2. **Automatic Detection** shows date and time filter panels if relevant columns found
3. **Add Date Filter**: 
   - Select column: "Date Column"
   - Choose operation: "After"
   - Pick date: "2025-01-01"
4. **Add Time Filter**:
   - Select column: "Time Column"
   - Choose operation: "After"
   - Pick time: "11:30"
5. **Results**: Only rows with dates after January 1, 2025 AND times after 11:30 AM are shown
6. **Visual Feedback**: "15 of 100 rows" and "2 filters active" chips

## Benefits

### ✅ **User Experience**
- **Intuitive Interface**: Familiar date picker controls
- **Visual Feedback**: Clear indicators of active filters and results
- **Easy Management**: Simple add/remove filter workflow

### ✅ **Flexibility**
- **Multiple Formats**: Handles various date formats automatically
- **Multiple Filters**: Can apply multiple date filters simultaneously
- **Real-time Updates**: Immediate feedback on filter changes

### ✅ **Robust Parsing**
- **Format Detection**: Automatically handles different date formats
- **Validation**: Validates date ranges and formats
- **Error Handling**: Gracefully handles invalid dates
- **Timezone Safety**: Consistent date handling prevents off-by-one-day issues

## Future Enhancements

- **Relative Dates**: "Last 30 days", "This month", etc.
- **Relative Times**: "Last 2 hours", "This morning", etc.
- **Export Filtered Data**: Option to copy only filtered results
- **Save Filter Presets**: Save commonly used date and time filter combinations
- **Combined DateTime Filtering**: For cases where date and time are in the same column

---

## 🎉 **Result: Powerful date and time filtering for Abbott data analysis!**

Users can now easily filter their Abbott blood testing data by date ranges and times using separate columns, making it much easier to analyze time-based trends and prepare specific date and time ranges for eLabs upload.
