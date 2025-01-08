import { FC, ChangeEvent, useState } from 'react';
import {
  Tooltip,
  Divider,
  Box,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TableContainer,
  Typography,
  useTheme,
} from '@mui/material';

import VisibilityIcon from '@mui/icons-material/Visibility';
import { AclidScreen } from '../mpi/models/aclid';
import AclidBiosecurityDetails from '../components/AclidBiosecurityDetails';

interface ScreenerTableProps {
  className?: string;
  screenings: AclidScreen[];
}

const applyPagination = (
  screenings: AclidScreen[],
  page: number,
  limit: number
): AclidScreen[] => {
  if (screenings) {
    return screenings.slice(page * limit, page * limit + limit);
  } else {
    return [];
  }
};

const getStatusLabel = (status: keyof typeof map): JSX.Element => {
  const map = {
    controlled: {
      text: 'Controlled',
      color: 'error'
    },
    'not_controlled': {
      text: 'Not controlled',
      color: 'success'
    },
    'needs_investigation': {
      text: 'Needs investigation',
      color: 'warning'
    },
  };

  if (!status) {
    return <></>;
  }

  if (map[status]) {
    const { text, color } = map[status];
    return <span color={color}>{text}</span>;
  } else {
    return <span color='success'>{status}</span>;
  }

};

const convertUnderscoreToSpace = (str: string): string => {
  return str.split('_').join(' ');
}

const ScreenerTable: FC<ScreenerTableProps> = ({ screenings }) => {
  const theme = useTheme();

  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [open, setOpen] = useState(false);
  const [viewingScreening, setViewingScreening] = useState<AclidScreen | null>(null);

  const handleClickOpen = (screening: AclidScreen) => {
    setViewingScreening(screening);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };


  const handlePageChange = (event: any, newPage: number): void => {
    setPage(newPage);
  };

  const handleLimitChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setLimit(parseInt(event.target.value));
  };

  const paginatedScreenings = applyPagination(
    screenings,
    page,
    limit
  );

  return (
    <Card>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Overall regulatory status</TableCell>
              <TableCell>US CCL Export control</TableCell>
              <TableCell>EU Dual Use export control</TableCell>
              <TableCell>US Screening framework</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedScreenings.map((screening) => {
              return (
                <TableRow
                  hover
                  key={screening.id}
                >
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      sx={{ maxWidth: 150, textOverflow: "ellipsis" }}
                      gutterBottom
                      noWrap
                    >
                      {screening.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      sx={{ textTransform: 'capitalize' }}
                      gutterBottom
                      noWrap
                    >
                      {screening.status}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      gutterBottom
                      noWrap
                    >
                      {getStatusLabel(screening.regulatory_status as "controlled" | "not_controlled" | "needs_investigation")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      sx={{ textTransform: 'capitalize' }}
                      gutterBottom
                      noWrap
                    >
                      {screening.findings.us_ccl_export_control ?
                        `${convertUnderscoreToSpace(screening.findings.us_ccl_export_control.regulatory_status)} - ${convertUnderscoreToSpace(screening.findings.us_ccl_export_control.reason_code)}`
                        : screening.status === "succeeded" ? "Not controlled" : ""
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      sx={{ textTransform: 'capitalize' }}
                      gutterBottom
                      noWrap
                    >
                      {screening.findings.eu_dual_use_export_control ?
                        `${convertUnderscoreToSpace(screening.findings.eu_dual_use_export_control.regulatory_status)} - ${convertUnderscoreToSpace(screening.findings.eu_dual_use_export_control.reason_code)}`
                        : screening.status === "succeeded" ? "Not controlled" : ""
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="text.primary"
                      sx={{ textTransform: 'capitalize' }}
                      gutterBottom
                      noWrap
                    >
                      {screening.findings.us_screening_framework ?
                        `${convertUnderscoreToSpace(screening.findings.us_screening_framework.regulatory_status)} - ${convertUnderscoreToSpace(screening.findings.us_screening_framework.reason_code)}`
                        : screening.status === "succeeded" ? "Not controlled" : ""
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View details" arrow>
                      <IconButton
                        sx={{
                          '&:hover': { background: theme.palette.secondary.light },
                          color: theme.palette.secondary.main
                        }}
                        color="inherit"
                        size="small"
                        onClick={() => handleClickOpen(screening)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box p={2}>
        <TablePagination
          component="div"
          count={screenings?.length || 0}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleLimitChange}
          page={page}
          rowsPerPage={limit}
          rowsPerPageOptions={[5, 10, 25, 30]}
        />
      </Box>
      {open && <AclidBiosecurityDetails onClose={handleClose} open={open} screening={viewingScreening} />}
    </Card>
  );
};

export default ScreenerTable;
