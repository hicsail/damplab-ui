import React, { useContext } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Badge, Box, Button, Chip, Stack, Typography } from '@mui/material';

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import CampaignIcon from '@mui/icons-material/Campaign';
import BugReportIcon from '@mui/icons-material/BugReport';
import EditIcon from '@mui/icons-material/Edit';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import SchoolIcon from '@mui/icons-material/School';
import MonitorIcon from '@mui/icons-material/Monitor';
import PeopleIcon from '@mui/icons-material/People';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import InsightsIcon from '@mui/icons-material/Insights';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import ScienceIcon from '@mui/icons-material/Science';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PlaceIcon from '@mui/icons-material/Place';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import { useEffectiveUser } from "../hooks/useEffectiveUser";
import AnnouncementBox from '../components/AnnouncementBox';
import { JOBS_FEED_STATUS } from '../gql/queries';
import { MARK_JOBS_FEED_VIEWED } from '../gql/mutations';
import { HomeMenuItemDef, HomeMenuItemId, visibleHomeMenu } from './homeMenu';
import { canFor, PERMISSIONS } from '../hooks/usePermissions';

/**
 * One icon per menu item. Typed as an exhaustive Record so adding an item to
 * `homeMenu.ts` without an icon is a compile error rather than a blank button.
 */
const MENU_ICONS: Record<HomeMenuItemId, React.ReactNode> = {
  'order-services': <AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />,
  'catalog': <FormatListBulletedIcon />,
  'book-inventory': <EventAvailableIcon />,
  'learning-hub': <SchoolIcon />,
  'bugs': <BugReportIcon />,
  'bug-backlog': <FormatListBulletedIcon />,
  'damplab-website': <img src="/damp-white.svg" height="30px" alt="DAMP Logo" />,
  'jobs': <ViewStreamIcon />,
  'staff-submit-job': <SupervisorAccountOutlinedIcon />,
  'my-bench': <ScienceIcon />,
  'inventory-availability': <PrecisionManufacturingIcon />,
  'inventory-schedule': <EventAvailableIcon />,
  'release-notes': <FormatListBulletedIcon />,
  'catalog-inventory-editor': <EditIcon />,
  'protocol-library': <AccountTreeIcon />,
  'lab-layout': <PlaceIcon />,
  'announcements': <CampaignIcon />,
  'billing': <ReceiptLongIcon />,
  'ai-lab-assistant': <InsightsIcon />,
  'customer-management': <PeopleIcon />,
  'api-keys': <VpnKeyIcon />,
  'data-translation': <EditIcon />,
  'lab-monitor-north': <MonitorIcon />,
  'lab-monitor-south': <MonitorIcon />,
  'lab-status-tv': <MonitorIcon />,
};

function MenuButton({ onClick, navigateTo, children }: any) {
  const navigate = useNavigate();
  return (
    <Button
      variant="contained"
      onClick={onClick ? onClick : () => navigate(navigateTo)}
      sx={{
        width: '210px',
        minWidth: '210px',
        height: '72px',
        textTransform: 'none',
        alignItems: 'center',
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {children[0]}
        <Box sx={{ width: '100%', lineHeight: 1.2 }}>{children.slice(1)}</Box>
      </Box>
    </Button>
  );
}

/**
 * Renders nothing at all when it has no children. Sections are mixed across roles
 * now, so an emptied section would otherwise leave a dangling orphan heading — a
 * client staring at "Admin Management Tools" above blank space.
 */
function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  if (React.Children.count(children) === 0) return null;
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>{children}</Box>
    </Box>
  );
}

export default function Home() {
  const apolloClient = useApolloClient();
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const { userProps: effectiveUserProps } = useEffectiveUser();
  const userProps: UserProps = effectiveUserProps;
  /**
   * The unseen-jobs badge is about the *shared* jobs feed — every submitted job —
   * so it is a `jobs:view-all` concept, not a staff-boolean one. `jobsFeedStatus`
   * and `markJobsFeedViewed` both require that permission, so a technician now gets
   * the dot and a client neither sees it nor 403s asking for it.
   */
  const canViewAllJobs = canFor(userProps, PERMISSIONS.JobsViewAll);
  const { data: jobsFeedData } = useQuery(JOBS_FEED_STATUS, {
    skip: !canViewAllJobs,
    pollInterval: 10000,
    fetchPolicy: 'network-only'
  });
  const [markJobsFeedViewed] = useMutation(MARK_JOBS_FEED_VIEWED);

  // Redirect to login if not authenticated
  if (!userProps?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function logout() {
    apolloClient.resetStore();
    userContext.keycloak.logout();
  }

  async function openJobsDashboard() {
    if (canViewAllJobs) {
      try {
        await markJobsFeedViewed();
      } catch {
        // If marking viewed fails, still navigate to keep UX responsive.
      }
    }
    navigate('/dashboard');
  }

  /** Turn a menu item's declared destination into the click it needs. */
  function activate(item: HomeMenuItemDef) {
    if (item.action === 'open-jobs-dashboard') return void openJobsDashboard();
    if (item.href) {
      window.location.href = item.href;
      return;
    }
    if (item.to) navigate(item.to);
  }

  const menuSections = visibleHomeMenu(userProps);

  const appellation = (userProps?.idTokenParsed as any)?.name || (userProps?.idTokenParsed as any)?.email || "DAMPLab User";

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        p: 3,
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {/* Top row: Welcome (left) + Logout (right) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mb: 1,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Welcome to DAMPLab
        </Typography>
        <Button variant="contained" color="secondary" onClick={logout}>
          Logout
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Hello, {appellation}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
        {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
        {userProps.isExternalCustomer && <Chip label="External Customer" />}
      </Stack>

      {/* Navigation: sectioned menu + announcements */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 700px', minWidth: 320 }}>
          {menuSections.map((section) => (
            <MenuSection key={section.title} title={section.title}>
              {section.items.map((item) => (
                <MenuButton key={item.id} onClick={() => activate(item)}>
                  {item.badge === 'jobs-feed-unseen' ? (
                    <Badge color="error" variant="dot" overlap="circular" invisible={!jobsFeedData?.jobsFeedStatus?.hasUnseen}>
                      {MENU_ICONS[item.id]}
                    </Badge>
                  ) : (
                    MENU_ICONS[item.id]
                  )}
                  {item.label}
                </MenuButton>
              ))}
            </MenuSection>
          ))}
        </Box>
        <AnnouncementBox />
      </Box>
    </Box>
  );
}
