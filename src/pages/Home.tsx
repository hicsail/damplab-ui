import { useContext } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useApolloClient } from '@apollo/client';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import CampaignIcon from '@mui/icons-material/Campaign';
import EditIcon from '@mui/icons-material/Edit';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import AnnouncementBox from '../components/AnnouncementBox';

function MenuButton({ onClick, navigateTo, children }: any) {
  const navigate = useNavigate();
  return (
    <Button
      variant="contained"
      onClick={onClick ? onClick : () => navigate(navigateTo)}
      sx={{ width: '210px', minWidth: '210px', textTransform: 'none' }}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {children[0]}
        <Box sx={{ width: '100%' }}>{children.slice(1)}</Box>
      </Box>
    </Button>
  );
}

export default function Home() {
  const apolloClient = useApolloClient();
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = userContext.userProps;

  // Redirect to login if not authenticated
  if (!userProps?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function logout() {
    apolloClient.resetStore();
    userContext.keycloak.logout();
  }

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

      {/* Navigation: horizontal wrapping row */}
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <MenuButton onClick={() => (window.location.href = 'https://www.damplab.org/services')}>
            <img src="/damp-white.svg" height="30px" alt="DAMP Logo" />
            DAMPLab Site<br />(See Service Prices)
          </MenuButton>
          <MenuButton navigateTo="/canvas">
            <AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />
            Canvas<br />(Design Workflows)
          </MenuButton>
          <MenuButton navigateTo="/my_jobs">
            <WorkHistoryIcon />
            My Jobs<br />(View Submitted Jobs)
          </MenuButton>
          {userProps.isDamplabStaff && (
            <>
              <MenuButton navigateTo="/dashboard">
                <ViewStreamIcon />
                Dashboard<br />(See Submitted Jobs)
              </MenuButton>
              <MenuButton navigateTo="/edit">
                <EditIcon />
                Admin Edit<br />(Edit Services)
              </MenuButton>
              <MenuButton navigateTo="/release_notes">
                <FormatListBulletedIcon />
                Release Notes<br />(+ Other Admin Info)
              </MenuButton>
              <MenuButton navigateTo="/data_translation">
                <EditIcon />
                Data Translation<br />(Abbott to eLabs)
              </MenuButton>
              <MenuButton navigateTo="/edit_announcements">
                <CampaignIcon />
                Add Announcement<br />(+ Edit)
              </MenuButton>
            </>
          )}
        </Box>
        <AnnouncementBox />
      </Box>
    </Box>
  );
}
