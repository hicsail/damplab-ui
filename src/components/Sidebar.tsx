import React, { useState, useEffect, MouseEvent, useContext, useRef } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { GET_CATEGORIES }             from '../gql/queries';
import { addNodesAndEdgesFromBundle } from '../controllers/GraphHelpers';
import { Service }       from '../types/Service';
import { CanvasContext } from '../contexts/Canvas';
import { AppContext }    from '../contexts/App';
import { ImagesBundlesDict, ImagesServicesDict } from '../assets/icons';


export default () => {
  const {services, bundles}  = useContext(AppContext);
  const {setNodes, setEdges} = useContext(CanvasContext);

  const [category,         setCategory]         = useState('');
  const [alignment,        setAlignment]        = useState('bundles');
  const [filteredServices, setFilteredServices] = useState(services);
  const [filteredBundles,  setFilteredBundles]  = useState(bundles);
  const [searchText,       setSearchText]       = useState('');
  const [bundleSearchText, setBundleSearchText] = useState('');
  const serviceSearchRef = useRef<HTMLInputElement | null>(null);
  const bundleSearchRef = useRef<HTMLInputElement | null>(null);


  const buttonElementStyle = {
    padding: 10,
    // borderColor: '#8bbae8',
  };

  const borderStyles = {
    m: 1,
    border: 1,
    borderRadius: '5px', 
  };

  // events for dragging nodes
  const onDragStart = (event: React.DragEvent, payload: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  const handleToggleChange = (
    event: MouseEvent<HTMLElement>,
    newAlignment: string | null,
  ) => {
    if (newAlignment !== null) {
      setAlignment(newAlignment);
    }
  };

  // execute query to get categories
  const { loading, error, data } = useQuery(GET_CATEGORIES);
  const categories = data?.categories || [];
  if (error !== undefined) {
    console.error(error);
  }

  // filtering services by category, update filteredServices when category or services change
  useEffect(() => {
    if (category === '' && searchText === '') {
      setFilteredServices(services);
    } 
    else if (category === '' && searchText !== '') {
      // filter services by search text
      setFilteredServices(services.filter((service: Service) => service.name.toLowerCase().includes(searchText.toLowerCase())));
    }
    else if (category !== '' && searchText !== '') {
      // filter services by search text
      setFilteredServices(categories.find((cat: any) => cat.id === category).services.filter((service: Service) => service.name.toLowerCase().includes(searchText.toLowerCase())));
    }
    else {
      // set filtered services as category.services
      setFilteredServices(categories.find((cat: any) => cat.id === category).services);
    }
  }, [category, services, searchText, categories]);

  useEffect(() => {
    if (bundleSearchText.trim() === '') {
      setFilteredBundles(bundles);
      return;
    }

    const lowered = bundleSearchText.toLowerCase();
    setFilteredBundles(
      bundles.filter((bundle: any) => bundle.label.toLowerCase().includes(lowered))
    );
  }, [bundleSearchText, bundles]);

  useEffect(() => {
    const handleSlashShortcut = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || target?.getAttribute('contenteditable') === 'true';
      if (isEditable) return;

      event.preventDefault();
      if (alignment === 'services') {
        serviceSearchRef.current?.focus();
      } else {
        bundleSearchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleSlashShortcut);
    return () => window.removeEventListener('keydown', handleSlashShortcut);
  }, [alignment]);

  return (
    <aside style={{ padding: 30, height: '80vh', overflow: 'scroll' }}>
      <ToggleButtonGroup
        value      = {alignment}
        onChange   = {handleToggleChange}
        color      = "primary"
        aria-label = "Platform"
        exclusive
      >
        <ToggleButton value="bundles">Bundles</ToggleButton>
        <ToggleButton value="services">Services</ToggleButton>
      </ToggleButtonGroup>
      {
        alignment === 'services' ? (
          <div>
            <br/>
            <TextField
              fullWidth
              size="small"
              placeholder="Search services..."
              value={searchText}
              inputRef={serviceSearchRef}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="clear service search"
                      size="small"
                      onClick={() => setSearchText('')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <br/>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Chip size="small" label={`${filteredServices.length} results`} />
              <Tooltip title="Shortcut: press / to focus search">
                <Typography variant="caption" color="text.secondary">Press / to search</Typography>
              </Tooltip>
            </Box>
            <div style={{ margin: 15 }}>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Category</InputLabel>
                <Select
                  value    = {category}
                  onChange = {handleChange}
                  labelId  = "demo-simple-select-label"
                  id       = "demo-simple-select"
                  label    = "Category"
                >
                  <MenuItem key={2343} value={''}>{'All'}</MenuItem>
                  {
                    categories.map((category: any) => {
                      return <MenuItem key={category.id} value={category.id}>{category.label}</MenuItem>
                    })
                  }
                </Select>
              </FormControl>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Typography variant="body2">Drag services to the canvas to construct workflows.</Typography>
              <Tooltip title="Tip: use search and category together to quickly find a service.">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
            </div>
            {
              filteredServices.map((service: Service) => {
                return (
                  <Paper
                    key={service.id}
                    title={service.name}
                    style={buttonElementStyle}
                    className="dndnode output"
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'grab',
                      px: 1,
                      py: 1,
                      ...borderStyles,
                      '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                    }}
                    onDragStart={(event) => onDragStart(event, { itemType: 'service', payload: service })}
                    draggable
                  >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
                        {ImagesServicesDict[service.name] && <img src = {ImagesServicesDict[service.name]} alt = "img not found" style = {{ height: 40 }} /> }
                        <div style={{ padding: 5, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', width: '100%', textAlign: 'center' }}>
                          {service.name}
                        </div>
                      </div>
                      <Tooltip title="Drag to canvas">
                        <DragIndicatorIcon fontSize="small" color="action" />
                      </Tooltip>
                  </Paper>
                )
              })
            }
            {filteredServices.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No services match your filters. Clear search or choose a different category.
              </Typography>
            ) : null}
          </div>
          ) : (
          <div>
            <div>
                <br/>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search bundles..."
                  value={bundleSearchText}
                  inputRef={bundleSearchRef}
                  onChange={(e) => setBundleSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: bundleSearchText ? (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear bundle search"
                          size="small"
                          onClick={() => setBundleSearchText('')}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />
                <br/>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip size="small" label={`${filteredBundles.length} results`} />
                  <Tooltip title="Shortcut: press / to focus search">
                    <Typography variant="caption" color="text.secondary">Press / to search</Typography>
                  </Tooltip>
                </Box>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Typography variant="body2">
                    Drag or click a bundle to add its full workflow.
                  </Typography>
                  <Tooltip title="Dragging lets you place the bundle where you want on the canvas.">
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Tooltip>
                </div>
                <br/>
            </div>
            {
              // TODO: Change bundle data structure to preserve service order!  Needing to check bundles.tsx just to get the correct service order...
              filteredBundles.map((bundle: any) => {
                return (
                  <Paper
                  key={bundle.id}
                  title={bundle.label}
                  style={buttonElementStyle}
                  className="dndnode output"
                  variant="outlined"
                  sx={{
                    width: 180,
                    borderRadius: 1,
                    '&:hover': { boxShadow: 2, borderColor: 'primary.main' }
                  }}
                  onDragStart={(event) => onDragStart(event, { itemType: 'bundle', payload: bundle })}
                  draggable
                  >
                    <Button
                    variant="text"
                    title={bundle.label}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      textTransform: 'none',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.2,
                      py: 1,
                      cursor: 'grab',
                      border: 'none',
                      boxShadow: 'none',
                    }}
                    onClick={() => addNodesAndEdgesFromBundle(bundle, services, setNodes, setEdges)}>
                      <div>
                        {/* URL (e.g. to Google Drive) from the DB... */}
                        {/* <img src = {bundle.icon} alt = " " style = {{ height: 100 }} /> */}
                        {/* Local files in src/assets/icons folder... */}
                        <img src={ImagesBundlesDict[bundle.label]} alt=" " style={{ height: 100 }} />
                      </div>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {bundle.label}
                        </Typography>
                        <Tooltip title="Drag to choose placement, or click to auto-place">
                          <DragIndicatorIcon fontSize="small" color="action" />
                        </Tooltip>
                      </Box>
                    </Button>
                  </Paper>
                )
              })
            }
            {filteredBundles.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No bundles found. Try a different search term.
              </Typography>
            ) : null}
          </div>
        )
      }
    </aside>
  );
};
