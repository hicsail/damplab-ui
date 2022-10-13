import React from 'react';
import Button from '@mui/material/Button';

export default () => {

  const onDragStart = (event: any, nodeType: any) => {

    console.log('dragstart:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const buttonElementStyle = {
    padding: 10,

  };

  return (
    <aside style={{padding: 20}}>
      <div className="description">You can drag these nodes to the pane on the right.</div>
      <div style={buttonElementStyle} className="dndnode input" onDragStart={(event) => onDragStart(event, 'input')} draggable>
        <Button variant="outlined">
          Input Node
        </Button>
      </div>
      <div style={buttonElementStyle} className="dndnode" onDragStart={(event) => onDragStart(event, 'default')} draggable>
        <Button variant="outlined">
          Default Node
        </Button>
      </div>
      <div style={buttonElementStyle} className="dndnode output" onDragStart={(event) => onDragStart(event, 'output')} draggable>
        <Button variant="outlined">
          Output Node
        </Button>
      </div>
    </aside>
  );
};