import React, { useState, useEffect, MouseEvent, useContext } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Button, FormControl, InputLabel, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';

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
  const [searchText,      setSearchText]       = useState('');


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
  const onDragStart = (event: any, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  const handleToggleChange = (
    event: MouseEvent<HTMLElement>,
    newAlignment: string,
  ) => {
    setAlignment(newAlignment);
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
  }, [category, services, searchText]);

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
            <input type="text" placeholder="Search services..." onChange={(e) => setSearchText(e.target.value)} />
            <br/>
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
            <div>
              Drag services to the canvas to construct workflows.
            </div>
            {
              filteredServices.map((service: Service) => {
                return (
                  <Box key={Math.random().toString(36).substring(2, 9)} title={service.name} 
                  style={buttonElementStyle} className="dndnode output" 
                  sx={{ display: 'flow', justifyContent: 'space-around', alignItems: 'center', ...borderStyles }} 
                  onDragStart={(event) => onDragStart(event, JSON.stringify(service))} draggable>
                      <div>
                        {/* URL (e.g. to Google Drive) from the DB... */}
                        {/* <img src = {service.icon} alt = " " style = {{ height: 60 }} /> */}
                        {/* Local files in src/assets/icons folder... */}
                        {ImagesServicesDict[service.name] && <img src = {ImagesServicesDict[service.name]} alt = "img not found" style = {{ height: 60 }} /> }
                      </div>
                      <div style={{padding: 5}}>
                        {service.name}
                      </div>
                  </Box> 
                )
              })
            }
          </div>
          ) : (
          <div>
            <div>
                <br/>
                Click on a bundle to add all services as a workflow.
                <br/>
                <br/>
            </div>
            {
              // TODO: Change bundle data structure to preserve service order!  Needing to check bundles.tsx just to get the correct service order...
              bundles.map((bundle: any) => {
                return (
                  <div key={Math.random().toString(36).substring(2, 9)} 
                  style={buttonElementStyle} className="dndnode output" 
                  onDragStart={(event) => onDragStart(event, JSON.stringify(bundle))} draggable>
                    <Button variant="outlined" title={bundle.label}  sx={{boxShadow: 2}}
                    style={{ width: 180, display: 'flow', justifyContent: 'space-around' }}
                    onClick={() => addNodesAndEdgesFromBundle(bundle, services, setNodes, setEdges)}>
                      <div>
                        {/* URL (e.g. to Google Drive) from the DB... */}
                        {/* <img src = {bundle.icon} alt = " " style = {{ height: 100 }} /> */}
                        {/* Local files in src/assets/icons folder... */}
                        <img src={ImagesBundlesDict[bundle.label]} alt=" " style={{ height: 100 }} />
                      </div>
                      {bundle.label}
                    </Button>
                  </div>
                )
              })
            }
          </div>
        )
      }
    </aside>
  );
};
