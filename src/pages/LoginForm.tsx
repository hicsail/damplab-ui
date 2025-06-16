import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button, Chip, Stack } from '@mui/material';

import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon         from '@mui/icons-material/ViewStream';
import CampaignIcon           from '@mui/icons-material/Campaign';
import EditIcon from '@mui/icons-material/Edit';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import  AnnouncementBox  from '../components/AnnouncementBox';

export default function LoginForm() {
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const [userProps, setUserProps] = useState<UserProps | undefined>(undefined);

  useEffect(() => {
    async function awaitUserProps() {
      const userProps = await userContext.userProps;
      setUserProps(userProps);
    }
    awaitUserProps();
  }, [userContext]);

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
    <Stack direction="row" spacing={1}>
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
      <Button
        variant="contained"
        onClick={() => window.location.href = "https://www.damplab.org/services"}
        sx={{ mb: 2, width: '210px', textTransform: 'none' }}
      >
        <img src='/damp-white.svg' height='30px' style={{ margin: 1, marginLeft: -25, marginRight: 10 }} alt="DAMP Logo" />
        DAMPLab Site<br />(See Service Prices)
      </Button>

      <Button
        variant="contained"
        onClick={() => navigate('/canvas')}
        sx={{ m: 2, width: '210px', textTransform: 'none' }}
      >
        <AccountTreeIcon sx={{ m: 1, ml: -4, transform: "rotate(90deg) scaleY(-1)" }} />
        CANVAS<br />(Design Workflows)
      </Button>

      {userProps.isDamplabStaff && (
        <>
          <Button variant="contained" onClick={() => navigate('/dashboard')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
            <ViewStreamIcon sx={{m:1, ml:-3}}/>DASHBOARD<br/>(See Submitted Jobs)
          </Button> 
          <Button variant="contained" onClick={() => navigate('/edit')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
            <EditIcon sx={{m:1, ml:-8}} />Admin Edit<br/>(Edit Services)
          </Button>
          <Button variant="contained" onClick={() => navigate('/release_notes')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
            <FormatListBulletedIcon sx={{m:1, ml:-3}}/>Release Notes<br/>(+ Other Admin Info)
          </Button> 
          <Button variant="contained" onClick={() => navigate('/edit_announcements')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
            <CampaignIcon sx={{m:1, ml:-3}}/>Add Announcement<br/>(+ Edit)
          </Button>
        </>
      )}
      <Button variant="contained" color="secondary" onClick={() => userContext.keycloak.logout()}  sx={{ m: 5 }}>Logout</Button>
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
