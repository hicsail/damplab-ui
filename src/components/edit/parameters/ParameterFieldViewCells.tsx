/*
    Custom renderCells for the parameters table.
 */

import * as React from "react";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Button, Tooltip } from "@mui/material";

export function ParameterOptionsViewCell(props: GridRenderCellParams) {
  const [isHover, setIsHover] = React.useState(false);
  const isDisabled = props.row.type !== "dropdown";

  return (
    <Tooltip
      open={isDisabled && isHover}
      title={"Options is only applicable for parameters of type dropdown."}
      arrow
    >
      <Box
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        width={"fit-content"}
      >
        <Button
          variant="contained"
          disabled={isDisabled}
          onClick={() => props.handleOptionsViewButton(props)}
        >
          View
        </Button>
      </Box>
    </Tooltip>
  );
}

export function ParameterTableViewCell(props: GridRenderCellParams) {
  const [isHover, setIsHover] = React.useState(false);
  const isDisabled = props.row.type !== "table";

  return (
    <Tooltip
      open={isDisabled && isHover}
      title={"TableData is only applicable for parameters of type table."}
      arrow
    >
      <Box
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        width={"fit-content"}
      >
        <Button
          variant="contained"
          disabled={isDisabled}
          onClick={() => props.handleTableDataButton(props)}
        >
          View
        </Button>
      </Box>
    </Tooltip>
  );
}
