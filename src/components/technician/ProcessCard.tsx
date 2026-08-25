import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Collapse, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PartyStatusRail from './PartyStatusRail';
import { STATUS_PANE_MIN_HEIGHT } from '../CollapsibleStatusCard';
import type { PartyBadge } from '../../utils/technicianProcessStatus';

/**
 * Technician job-page card: parties and status always visible; buttons and
 * details expand together from the card header.
 */

interface Props {
  title: string;
  customerBadge: PartyBadge;
  staffBadge: PartyBadge;
  customerVersion: string;
  staffVersion: string;
  statusPane: React.ReactNode;
  statusPaneSx?: object;
  details: React.ReactNode;
  actions: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function ProcessCard({
  title,
  customerBadge,
  staffBadge,
  customerVersion,
  staffVersion,
  statusPane,
  statusPaneSx,
  details,
  actions,
  defaultExpanded = false
}: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const toggle = () => setExpanded((open) => !open);

  const headerToggle = {
    onClick: toggle,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          {...headerToggle}
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 1.5,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          <ExpandMoreIcon
            sx={{
              flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms'
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: expanded ? 'flex-start' : 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Box
            sx={{ width: { xs: '100%', md: 208 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PartyStatusRail
              customerBadge={customerBadge}
              staffBadge={staffBadge}
              customerVersion={customerVersion}
              staffVersion={staffVersion}
            />
            <Collapse in={expanded} unmountOnExit={false}>
              <Stack spacing={1} alignItems="stretch">
                {actions}
              </Stack>
            </Collapse>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              onClick={toggle}
              sx={{
                p: 2,
                borderRadius: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                minHeight: STATUS_PANE_MIN_HEIGHT,
                boxSizing: 'border-box',
                ...statusPaneSx
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>{statusPane}</Box>
            </Box>
            <Collapse in={expanded} unmountOnExit={false}>
              <Box sx={{ pt: 2 }}>{details}</Box>
            </Collapse>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
