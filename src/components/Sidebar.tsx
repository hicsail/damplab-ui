import React, { useState, useEffect, MouseEvent, useContext } from 'react';
import Button from '@mui/material/Button';
import { Service } from '../types/Service';
import { bundles } from '../data/bundles';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { categories } from '../data/categories';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { addNodesAndEdgesFromBundle, addNodesAndEdgesFromServiceIds } from '../controllers/GraphHelpers';
import { CanvasContext } from '../contexts/Canvas';
import { useQuery, gql } from '@apollo/client';

export default () => {

  const [category, setCategory] = useState('');

  const [alignment, setAlignment] = useState('bundles');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState(services);

  const { setNodes, setEdges } = useContext(CanvasContext);

  const onDragStart = (event: any, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const buttonElementStyle = {
    padding: 10,
  };

  useEffect(() => {
    if (category === '') {
      setFilteredServices(services);
    } else {
      setFilteredServices(services.filter((service) => service.categories?.includes(category)));
    }
  }, [category]);


  const handleChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };


  const handleToggleChange = (
    event: MouseEvent<HTMLElement>,
    newAlignment: string,
  ) => {
    setAlignment(newAlignment);
  };

  const GET_SERVICES = gql`
  query GetServices {
    services {
      id
      name
      icon 
      parameters
      allowedConnections {
        id
        name
      }
    }
    }
  `;

  const { loading, error, data } = useQuery(GET_SERVICES);
  console.log(data);
  useEffect(() => {
    if (data) {
      setServices(data.services);
    }
  }, [data]);

  useEffect(() => {
    if (category === '') {
      setFilteredServices(services);
    } else {
      setFilteredServices(services.filter((service) => service.categories?.includes(category)));
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
                    categories.map((category) => {
                      return <MenuItem key={category.id} value={category.id}>{category.label}
                      </MenuItem>
                    })
                  }
                </Select>
              </FormControl>
            </div>

            {
              filteredServices.map((service: Service) => {

                // service.icon could be a url or a path to an svg, handle both cases and save to icon variable so that it can be used as src
                let icon = service.icon.startsWith('http') ? service.icon : "";
                if (service.icon.startsWith('http') === false && service.icon !== "") {
                  icon = require(`../assets/icons/${service.icon}`);
                }

                return (
                  <div key={Math.random().toString(36).substring(2, 9)} style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, JSON.stringify(service))} draggable>
                    <Button variant="outlined" style={{ width: 163, display: 'flex', justifyContent: 'space-around' }}>
                      <div>
                        <img src={icon} alt={service.name} style={{ width: 30 }} />
                      </div>
                      {service.name}
                    </Button>
                  </div>
                )
              })
            }
          </div>) : (
          <div>

            {
              bundles.map((bundle) => {
                return (
                  <div key={Math.random().toString(36).substring(2, 9)} style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, JSON.stringify(bundle))} draggable>
                    <Button variant="outlined" style={{ width: 163, display: 'flex', justifyContent: 'space-around' }} onClick={() => addNodesAndEdgesFromBundle(bundle, setNodes, setEdges)}>
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