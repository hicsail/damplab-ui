import React from 'react';
import { Avatar, Badge, Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { PartyBadge } from '../../utils/technicianProcessStatus';
import { STATUS_PANE_MIN_HEIGHT } from '../CollapsibleStatusCard';

/**
 * Customer vs DAMP Lab icons with a paper (holds it) or check (committed) badge
 * and the version that party can currently see.
 *
 * The versions are optional because the customer's own job page reuses this rail
 * without them: telling a client that the lab is holding a version numbered
 * above the one they were sent would leak an internal draft they are not meant
 * to know exists. Omitting them leaves the badges, which say who holds the
 * document without saying what.
 */

const ICON_SIZE = 60;

interface Props {
  customerBadge: PartyBadge;
  staffBadge: PartyBadge;
  customerVersion?: string;
  staffVersion?: string;
}

function PartyBadgeIcon({ badge }: { badge: PartyBadge }): React.JSX.Element | null {
  if (badge === 'paper') {
    return <DescriptionOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />;
  }
  if (badge === 'check') {
    return <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />;
  }
  return null;
}

function PartySlot({
  label,
  version,
  badge,
  avatar
}: {
  label: string;
  version?: string;
  badge: PartyBadge;
  avatar: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
      <Badge
        overlap="circular"
        invisible={!badge}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        badgeContent={<PartyBadgeIcon badge={badge} />}
        sx={{
          overflow: 'visible',
          '& .MuiBadge-badge': {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            p: 0.25,
            minWidth: 20,
            height: 20
          }
        }}
      >
        {avatar}
      </Badge>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.15, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      {version != null && (
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.15 }}>
          {version}
        </Typography>
      )}
    </Box>
  );
}

export default function PartyStatusRail({ customerBadge, staffBadge, customerVersion, staffVersion }: Props): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: 0.5,
        minHeight: STATUS_PANE_MIN_HEIGHT
      }}
    >
      <PartySlot
        label="Customer"
        version={customerVersion}
        badge={customerBadge}
        avatar={
          <Avatar sx={{ width: ICON_SIZE, height: ICON_SIZE, bgcolor: 'grey.300', color: 'text.secondary', flexShrink: 0 }} aria-label="Customer">
            <PersonIcon sx={{ fontSize: 34 }} />
          </Avatar>
        }
      />
      <PartySlot
        label="DAMP Lab"
        version={staffVersion}
        badge={staffBadge}
        avatar={
          <Box
            aria-label="DAMP Lab"
            sx={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              borderRadius: '50%',
              bgcolor: 'tertiary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            <Box
              component="img"
              src="/damp-white.svg"
              alt=""
              sx={{
                height: 36,
                width: 'auto',
                maxWidth: 38,
                display: 'block',
                mx: 'auto',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </Box>
        }
      />
    </Box>
  );
}
