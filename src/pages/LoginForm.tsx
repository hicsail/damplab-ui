import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Box, Button } from '@mui/material';

import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon         from '@mui/icons-material/ViewStream';
import CampaignIcon           from '@mui/icons-material/Campaign';

import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";

export default function LoginForm() {
  const navigate = useNavigate();
  const userContext : UserContextProps = useContext(UserContext);
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
      {!(userProps?.isAuthenticated) ? (
        <Button variant="contained" onClick={() => userContext.keycloak.login()}>Log in</Button>
      ) : (
        <>
          <Box sx={{ width: '300px' }}>
            <p>Hello, {appellation}.</p>
            {userProps.isDamplabStaff && <p>This account has Admin privileges.</p>}
            {userProps.isInternalCustomer && <p>This is an internal customer account.</p>}
            {userProps.isExternalCustomer && <p>This is an external customer account.</p>}
            {/* <Button variant="contained" onClick={() => navigate(role === 'admin' ? '/dashboard' : '/canvas')} style={{ marginRight: 10 }}>
              Go to {role === 'admin' ? 'Dashboard' : 'Canvas'}
            </Button> */}
            <Button variant="contained" onClick={() => window.location.href = "https://www.damplab.org/services"} sx={{ m: 2, width: '210px', textTransform: 'none', backgroundColor: '#8fb5ba' }}>
              <img src='/damp-white.svg' height='30px' style={{margin: 1, marginLeft: -25, marginRight: 10}} alt="DAMP Logo"/>DAMPLab Site<br/>(See Service Prices)
            </Button>
            <Button variant="contained" onClick={() => navigate('/canvas')}  sx={{ m: 2, width: '210px', textTransform: 'none', backgroundColor: '#8fb5ba' }}>
              <AccountTreeIcon sx={{m:1, ml:-4, transform: "rotate(90deg) scaleY(-1)"}}/>CANVAS<br/>(Design Workflows)
            </Button>
            {userProps.isDamplabStaff ?
              <>
                <Button variant="contained" onClick={() => navigate('/dashboard')}  sx={{ m: 2, width: '210px', textTransform: 'none', backgroundColor: '#8fb5ba' }}>
                  <ViewStreamIcon sx={{m:1, ml:-3}}/>DASHBOARD<br/>(See Submitted Jobs)
                </Button> 
                <Button variant="contained" onClick={() => navigate('/release_notes')}  sx={{ m: 2, width: '210px', textTransform: 'none', backgroundColor: '#8fb5ba' }}>
                  <FormatListBulletedIcon sx={{m:1, ml:-3}}/>Release Notes<br/>(+ Other Admin Info)
                </Button> 
                 <Button variant="contained" onClick={() => navigate('/edit_announcements')}  sx={{ m: 2, width: '210px', textTransform: 'none', backgroundColor: '#8fb5ba' }}>
                  <CampaignIcon sx={{m:1, ml:-3}}/>Add Announcement<br/>(+ Edit)
                </Button>
                {/* <Button variant="contained" onClick={() => navigate('/dominos')} sx={{ m: 2 }}>Go to Dominos Page</Button> 
                <Button variant="contained" onClick={() => navigate('/elabs')} sx={{ m: 2 }}>Go to eLabs Site</Button> 
                <Button variant="contained" onClick={() => navigate('/kernel')} sx={{ m: 2 }}>Go to Kernel Site</Button>  */}
              </>
              : ''
            }
            <Button variant="contained" onClick={() => userContext.keycloak.logout()}  sx={{ m: 5, backgroundColor: '#e04462' }}>Logout</Button>
          </Box>
        </>
      )}
    </Box>
  );
}
