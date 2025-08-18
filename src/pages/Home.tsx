// src/pages/HomePage.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client';
import { Box, Button, Chip, Stack } from '@mui/material';

import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon         from '@mui/icons-material/ViewStream';
import CampaignIcon           from '@mui/icons-material/Campaign';
import EditIcon               from '@mui/icons-material/Edit';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import AnnouncementBox from '../components/AnnouncementBox';

function MenuButton({ onClick, navigateTo, children }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="contained"
      onClick={onClick ? onClick : () => navigate(navigateTo)}
      sx={{ m:2, width: '210px', textTransform: 'none', '&:first-of-type': {
          mt: 0, // custom top margin of none just for the first
        },
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        {children[0]}
        <Box sx={{ width: '100%' }}>{children.slice(1)}</Box>
      </Box>
    </Button>
  );
}

export default function HomePage() {
  const apolloClient = useApolloClient();
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = userContext.userProps;

  const appellation =
    userProps?.idTokenParsed?.name ||
    userProps?.idTokenParsed?.email ||
    "DAMPLab User";

  function logout() {
    apolloClient.resetStore();
    userContext.keycloak.logout();
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Box sx={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
        {/* Greeting */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <p>Hello, {appellation}.</p>
          <Stack direction="row" spacing={1} sx={{ marginBottom: 5, justifyContent: 'center' }}>
            {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
            {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
            {userProps.isExternalCustomer && <Chip label="External Customer" />}
          </Stack>
        </Box>
      </Box>

        {/* Main Content Row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
          {/* Left column with buttons */}
          <Box sx={{ width: '300px', alignSelf: 'flex-start',mt: 0, pt: 0, minHeight: 0}}>
            <MenuButton onClick={() => window.location.href = "https://www.damplab.org/services"}>
              <img src='/damp-white.svg' height='30px' alt="DAMP Logo" />
              DAMPLab Site<br/>(See Service Prices)
            </MenuButton>


            <MenuButton navigateTo='/canvas'>
              <AccountTreeIcon sx={{ transform: "rotate(90deg) scaleY(-1)" }} />
              Canvas<br/>(Design Workflows)
            </MenuButton>

            {userProps.isDamplabStaff && (
              <>
                <MenuButton navigateTo='/dashboard'>
                  <ViewStreamIcon />Dashboard<br/>(See Submitted Jobs)
                </MenuButton>
                <MenuButton navigateTo='/edit'>
                  <EditIcon />Admin Edit<br/>(Edit Services)
                </MenuButton>
                <MenuButton navigateTo='/release_notes'>
                  <FormatListBulletedIcon />Release Notes<br/>(+ Other Admin Info)
                </MenuButton>
                <MenuButton navigateTo='/edit_announcements'>
                  <CampaignIcon />Add Announcement<br/>(+ Edit)
                </MenuButton>
              </>
            )}

            <Button variant="contained" color="error" onClick={logout} sx={{ m: 5 }}>
              Logout
            </Button>
          </Box>

          {/* Right Column: AnnouncementBox */}
            <AnnouncementBox />
        </Box>
    </Box>
  );
}
