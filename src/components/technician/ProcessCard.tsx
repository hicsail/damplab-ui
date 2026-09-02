import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Collapse, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PartyStatusRail from './PartyStatusRail';
import { STATUS_PANE_MIN_HEIGHT } from '../CollapsibleStatusCard';
import type { PartyBadge } from '../../utils/technicianProcessStatus';

/**
 * Technician job-page card: parties and status always visible. The card header
 * reveals actions; a separate control reveals right-column details.
 */

interface Props {
  title: string;
  customerBadge: PartyBadge;
  staffBadge: PartyBadge;
  /** Omitted on the customer's job page — see PartyStatusRail. */
  customerVersion?: string;
  staffVersion?: string;
  statusPane: React.ReactNode;
  statusPaneSx?: object;
  details: React.ReactNode;
  /** Optional: a card whose only actions are staff ones has an empty rail for a customer. */
  actions?: React.ReactNode;
  defaultExpanded?: boolean;
  /**
   * Whether the right column's details start open. Off for every staff card,
   * where details are supporting material behind one more click. The customer's
   * Statement of Work turns it on while a signature is outstanding: the signing
   * form lives in `details`, and a card that hides it is a card they cannot act
   * on — which is what the "Review and sign SOW" button scrolls them to.
   */
  defaultDetailsOpen?: boolean;
  /** Extra content beside the title, e.g. a document's reference number. */
  titleExtra?: React.ReactNode;
  cardRef?: React.Ref<HTMLDivElement>;
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
  defaultExpanded = false,
  defaultDetailsOpen = false,
  titleExtra,
  cardRef
}: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    if (!expanded) setDetailsOpen(false);
  }, [expanded]);

  // Declared after the collapse rule above so it wins on the render where both
  // fire — the props settle together when the document finishes loading, and the
  // rule above still sees the pre-update `expanded`.
  useEffect(() => {
    setDetailsOpen(defaultDetailsOpen);
  }, [defaultDetailsOpen]);

  const toggleCard = () => setExpanded((open) => !open);
  const toggleDetails = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setDetailsOpen((open) => !open);
  };

  return (
    <Card ref={cardRef} variant="outlined" sx={{ mb: 2 }} tabIndex={-1}>
      <CardContent sx={{ pb: 2, '&:last-child': { pb: 2 } }}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          onClick={toggleCard}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCard();
            }
          }}
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
          {titleExtra && (
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mr: 1 }}>
              {titleExtra}
            </Box>
          )}
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
            {actions && (
              <Collapse in={expanded} unmountOnExit={false}>
                <Stack spacing={1} alignItems="stretch">
                  {actions}
                </Stack>
              </Collapse>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
            <Collapse in={expanded} unmountOnExit={false}>
              <Box
                role="button"
                tabIndex={0}
                aria-expanded={detailsOpen}
                onClick={toggleDetails}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDetails(e);
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
                <Typography variant="body2">{detailsOpen ? 'Hide details' : 'Show details'}</Typography>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 20,
                    transform: detailsOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 150ms'
                  }}
                />
              </Box>
              <Collapse in={detailsOpen} unmountOnExit={false}>
                <Box sx={{ pt: 2 }}>{details}</Box>
              </Collapse>
            </Collapse>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
