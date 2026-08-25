import React, { useState } from 'react';
import { Box, Card, CardContent, Collapse, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/** Shared collapsed-header height so Job / SOW / Invoice panes line up. */
export const STATUS_PANE_MIN_HEIGHT = 96;

interface Props {
  title: string;
  titleExtra?: React.ReactNode;
  statusPane: React.ReactNode;
  statusPaneSx?: object;
  details: React.ReactNode;
  defaultExpanded?: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
}

/**
 * Single-column collapsible card: a colored status header and details behind
 * a Show details control. Used on the customer job page.
 */
export default function CollapsibleStatusCard({
  title,
  titleExtra,
  statusPane,
  statusPaneSx,
  details,
  defaultExpanded = false,
  cardRef
}: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => setExpanded((open) => !open);

  return (
    <Card ref={cardRef} variant="outlined" sx={{ mb: 2 }} tabIndex={-1}>
      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          {titleExtra && (
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {titleExtra}
            </Box>
          )}
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
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
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 1,
            cursor: 'pointer',
            userSelect: 'none',
            color: 'text.secondary',
            width: 'fit-content'
          }}
        >
          <Typography variant="body2">{expanded ? 'Hide details' : 'Show details'}</Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms'
            }}
          />
        </Box>
        <Collapse in={expanded} unmountOnExit={false}>
          <Box sx={{ pt: 2 }}>{details}</Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
