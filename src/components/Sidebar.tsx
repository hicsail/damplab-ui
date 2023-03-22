import React, { useState, useEffect, MouseEvent, useContext } from 'react';
import Button from '@mui/material/Button';
import { Service } from '../types/Service';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { addNodesAndEdgesFromBundle } from '../controllers/GraphHelpers';
import { CanvasContext } from '../contexts/Canvas';
import { useQuery, gql } from '@apollo/client';
import { GET_CATEGORIES } from '../gql/queries';
import { AppContext } from '../contexts/App';

export default () => {

  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any>([]);
  const [alignment, setAlignment] = useState('bundles');
  const {services, bundles} = useContext(AppContext);
  const [filteredServices, setFilteredServices] = useState(services);
  const {setNodes, setEdges} = useContext(CanvasContext);

  const buttonElementStyle = {
    padding: 10,
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
  const { loading, error, data } = useQuery(GET_CATEGORIES, {
    onCompleted: (data) => {
      console.log('data', data);
      setCategories(data.categories);
    },
    onError: (error) => {
      console.log('error', error);
    }
  });

  // filtering services by category, update filteredServices when category or services change
  useEffect(() => {
    if (category === '') {
      setFilteredServices(services);
    } else {
      // set filtered services as category.services
      setFilteredServices(categories.find((cat: any) => cat.id === category).services);
    }
  }, [category, services]);

  return (
    <aside style={{ padding: 20, height: '80vh', overflow: 'scroll' }}>
      <ToggleButtonGroup
        color="primary"
        value={alignment}
        exclusive
        onChange={handleToggleChange}
        aria-label="Platform"
      >
        <ToggleButton value="bundles">Bundles</ToggleButton>
        <ToggleButton value="services">Services</ToggleButton>
      </ToggleButtonGroup>
      {
        alignment === 'services' ? (
          <div>
            <div style={{ margin: 15 }}>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Category</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={category}
                  label="Category"
                  onChange={handleChange}
                >
                  <MenuItem key={2343} value={''}>{'All'}
                  </MenuItem>
                  {
                    categories.map((category: any) => {
                      return <MenuItem key={category.id} value={category.id}>{category.label}
                      </MenuItem>
                    })
                  }
                </Select>
              </FormControl>
            </div>
            {
              filteredServices.map((service: Service) => {
                return (
                  <div key={Math.random().toString(36).substring(2, 9)} style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, JSON.stringify(service))} draggable>
                    <Button variant="outlined" style={{ width: 163, display: 'flex', justifyContent: 'space-around' }}>
                      <div>
                        <img src={service.icon} alt={service.name} style={{ width: 30 }} />
                      </div>
                      {service.name}
                    </Button>
                  </div>
                )
              })
            }
          </div>
          ) : (
          <div>
            <div>
          
                Click on a bundle to add all services to the graph.

            </div>
            {
              bundles.map((bundle: any) => {
                return (
                  <div key={Math.random().toString(36).substring(2, 9)} style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, JSON.stringify(bundle))} draggable>
                    <Button variant="outlined" style={{ width: 163, display: 'flex', justifyContent: 'space-around', marginLeft: 'auto', marginRight: 'auto' }} onClick={() => addNodesAndEdgesFromBundle(bundle, services, setNodes, setEdges)}>
                      <div>
                        <img src={bundle.icon} style={{ width: 30 }} />
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