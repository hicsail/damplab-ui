// src/pages/LoginForm.tsx
import { useContext } from 'react';
import { Box, Button } from '@mui/material';
import { UserContext, UserContextProps } from "../contexts/UserContext";
import Home from './Home';

export default function LoginForm() {
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
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    }}
  >
    {!userProps?.isAuthenticated ? (
      <Button variant="contained" onClick={() => userContext.keycloak.login()}>
        Log in
      </Button>
    ) : (
      <>
        <Box sx={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <p>Hello, {appellation}.</p>
            <Stack
              direction="row"
              spacing={1}
              sx={{ marginBottom: 5, justifyContent: 'center' }}
            >
              {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
              {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
              {userProps.isExternalCustomer && <Chip label="External Customer" />}
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start', // aligns top edges
              gap: 3, // space between columns
            }}
          >
            {/* Left column with buttons */}
            <Box sx={{ width: '300px', alignSelf: 'flex-start' }}>
              <MenuButton
                onClick={() =>
                  (window.location.href = 'https://www.damplab.org/services')
                }
              >
                <img
                  src="/damp-white.svg"
                  height="30px"
                  alt="DAMP Logo"
                />
                DAMPLab Site
                <br />
                (See Service Prices)
              </MenuButton>

              <MenuButton navigateTo="/canvas">
                <AccountTreeIcon
                  sx={{ transform: 'rotate(90deg) scaleY(-1)' }}
                />
                Canvas
                <br />
                (Design Workflows)
              </MenuButton>

              {userProps.isDamplabStaff && (
                <>
                  <MenuButton navigateTo="/dashboard">
                    <ViewStreamIcon />
                    Dashboard
                    <br />
                    (See Submitted Jobs)
                  </MenuButton>
                  <MenuButton navigateTo="/edit">
                    <EditIcon />
                    Admin Edit
                    <br />
                    (Edit Services)
                  </MenuButton>
                  <MenuButton navigateTo="/release_notes">
                    <FormatListBulletedIcon />
                    Release Notes
                    <br />
                    (+ Other Admin Info)
                  </MenuButton>
                  <MenuButton navigateTo="/edit_announcements">
                    <CampaignIcon />
                    Add Announcement
                    <br />
                    (+ Edit)
                  </MenuButton>
                </>
              )}

              <Button
                variant="contained"
                color="error"
                onClick={logout}
                sx={{ m: 5 }}
              >
                Logout
              </Button>
            </Box>

            {/* Right Column: AnnouncementBox */}
            <Box sx={{ alignSelf: 'flex-start' }}>
              <AnnouncementBox />
            </Box>
          </Box>
        </Box>
      </>
    )}
  </Box>
);
}
