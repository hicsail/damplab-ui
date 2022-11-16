import React from 'react';
import Button from '@mui/material/Button';
import { Service } from '../types/Service';
import { services } from '../data/services';


export default () => {

  const onDragStart = (event: any, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const buttonElementStyle = {
    padding: 10,
  };

  

  return (
    <aside style={{ padding: 20, height: '80vh', overflow: 'scroll' }}>
      <div className="description">Will place filtering options here </div>
      
      {
        services.map((service: Service) => {
          return (
            <div key={Math.random().toString(36).substring(2, 9)} style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, JSON.stringify(service))} draggable>
              <Button variant="outlined" style={{width: 163, display: 'flex', justifyContent: 'space-around'}}>
                <div>
                <img src={service.icon} alt={service.name} style={{width: 30}}/>
                </div>
                {service.name}
              </Button>
            </div>
          )
        })
      }

    </aside>
  );
};