import { useContext } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useApolloClient } from '@apollo/client';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import CampaignIcon from '@mui/icons-material/Campaign';
import EditIcon from '@mui/icons-material/Edit';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import AnnouncementBox from '../components/AnnouncementBox';

function MenuButton({ onClick, navigateTo, children }: any) {
  const navigate = useNavigate();
  return (
    <Button 
      variant="contained" 
      onClick={onClick ? onClick : () => navigate(navigateTo)}  
      sx={{ m: 2, width: '210px', textTransform: 'none' }}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Welcome to DAMPLab
      </Typography>

      <Box sx={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Hello, {appellation}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ marginBottom: 5, justifyContent: 'center' }}>
            {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
            {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
            {userProps.isExternalCustomer && <Chip label="External Customer" />}
          </Stack>
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {/* User options buttons */}
          <Box sx={{ width: '300px' }}>
            <MenuButton onClick={() => window.location.href = "https://www.damplab.org/services"}>
              <img src='/damp-white.svg' height='30px' alt="DAMP Logo"/>
              DAMPLab Site<br/>(See Service Prices)
            </MenuButton>

            <MenuButton navigateTo='/canvas'>
              <AccountTreeIcon sx={{transform: "rotate(90deg) scaleY(-1)"}}/>
              Canvas<br />(Design Workflows)
            </MenuButton>

            {userProps.isDamplabStaff && (
              <>
                <MenuButton navigateTo='/dashboard'>
                  <ViewStreamIcon />
                  Dashboard<br />(See Submitted Jobs)
                </MenuButton>
                <MenuButton navigateTo='/edit'>
                  <EditIcon />
                  Admin Edit<br />(Edit Services)
                </MenuButton>
                <MenuButton navigateTo='/release_notes'>
                  <FormatListBulletedIcon />
                  Release Notes<br />(+ Other Admin Info)
                </MenuButton>
                <MenuButton navigateTo='/data_translation'>
                  <EditIcon />
                  Data Translation<br />(Abbott to eLabs formatting)
                </MenuButton>
                <MenuButton navigateTo='/edit_announcements'>
                  <CampaignIcon />
                  Add Announcement<br />(+ Edit)
                </MenuButton>
              </>
            )}
            <Button variant="contained" color="secondary" onClick={logout} sx={{ m: 5 }}>
              Logout
            </Button>
          </Box>

          {/* Right Column: AnnouncementBox */}
          <AnnouncementBox />
        </Box>
      </Box>
    </Box>
  );
}
