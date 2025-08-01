import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client';
import { Box, Button, Chip, Stack } from '@mui/material';

import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon         from '@mui/icons-material/ViewStream';
import CampaignIcon           from '@mui/icons-material/Campaign';
import EditIcon from '@mui/icons-material/Edit';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import  AnnouncementBox  from '../components/AnnouncementBox';

function MenuButton({onClick, navigateTo, children}) {
    const navigate = useNavigate();
    return (
        <Button variant="contained" onClick={onClick ? onClick : () => navigate(navigateTo)}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                {children[0]}
                <Box sx={{width: '100%'}}>{children.slice(1)}</Box>
            </Box>
        </Button>
    );
}

export default function LoginForm() {
  const apolloClient = useApolloClient();
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const userProps : UserProps = userContext.userProps;

  function logout() {
      // Technically we should clear the Apollo client cache on logout, but right now, even without the resetStore()
      // call, all queries get refetched anyway because the keycloak logout redirects essentially trigger a reload.
      // So this is redundant by happenstance. Do it anyway to be proper...
      apolloClient.resetStore();
      userContext.keycloak.logout();
  }

  const appellation = userProps?.idTokenParsed?.name || userProps?.idTokenParsed?.email || "DAMPLab User";

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      {!userProps?.isAuthenticated ? (
        <Button variant="contained" onClick={() => userContext.keycloak.login()}>
          Log in
        </Button>
      ) : (
        <>
<Box sx={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>

  <Box sx={{ mb: 3, textAlign: 'center' }}>
    <p>Hello, {appellation}.</p>
    <Stack direction="row" spacing={1} sx={{ marginBottom: 5, justifyContent: 'center' }}>
      {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
      {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
      {userProps.isExternalCustomer && <Chip label="External Customer" />}
    </Stack>
    {/* <Button variant="contained" onClick={() => navigate(role === 'admin' ? '/dashboard' : '/canvas')} style={{ marginRight: 10 }}> 
      Go to {role === 'admin' ? 'Dashboard' : 'Canvas'} </Button> */}
  </Box>


  {/* Left Column: user buttons  - annoucement box side to side */}

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
      <MenuButton onClick={() => window.location.href = "https://www.damplab.org/services"}><img src='/damp-white.svg' height='30px' alt="DAMP Logo"/>DAMPLab Site<br/>(See Service Prices)</MenuButton>

      <MenuButton navigateTo='/canvas'><AccountTreeIcon sx={{transform: "rotate(90deg) scaleY(-1)"}}/>Canvas<br />(Design Workflows)</MenuButton>

      {userProps.isDamplabStaff && (
        <>
          <MenuButton navigateTo='/dashboard'><ViewStreamIcon />Dashboard<br />(See Submitted Jobs)</MenuButton>
          <MenuButton navigateTo='/edit'><EditIcon />Admin Edit<br />(Edit Services)</MenuButton>
          <MenuButton navigateTo='/release_notes'><FormatListBulletedIcon />Release Notes<br />(+ Other Admin Info)</MenuButton>
          <MenuButton navigateTo='/edit_announcements'><CampaignIcon />Add Announcement<br />(+ Edit)</MenuButton>
        </>
      )}
      <Button variant="contained" color="secondary" onClick={logout}  sx={{ m: 5 }}>Logout</Button>
    </Box>

        {/* Right Column: AnnouncementBox (conditionally shown) */}
          <AnnouncementBox />
  
    </Box>

  </Box>

  </>
    )}
</Box>
  );
}
