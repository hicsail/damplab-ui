import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { handleLoginCallback, debugCheckToken } from '../mpi/SequencesQueries';
import { Box, CircularProgress, Typography } from '@mui/material';

const Auth0Callback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const error_description = url.searchParams.get("error_description");
        
        console.log("Processing Auth0 callback in dedicated component");
        console.log("Auth parameters:", { 
          hasCode: !!code, 
          hasState: !!state,
          hasError: !!error
        });
        
        if (error) {
          console.error("Auth0 error:", error, error_description);
          setError(`Authentication error: ${error_description || error}`);
          setIsProcessing(false);
          return;
        }
        
        if (!code) {
          setError("No authorization code received");
          setIsProcessing(false);
          return;
        }
        
        // Verify state parameter
        const storedState = localStorage.getItem('auth_state');
        if (state !== storedState) {
          setError("State mismatch, possible security issue");
          setIsProcessing(false);
          return;
        }
        
        // Process the code
        const success = await handleLoginCallback(code);
        
        // Clear state regardless of success
        localStorage.removeItem('auth_state');
        
        if (success) {
          console.log("Login successful, redirecting...");
          // Check token for debugging
          debugCheckToken();
          setIsSuccess(true);
        } else {
          setError("Failed to complete authentication");
        }
        
        setIsProcessing(false);
      } catch (e) {
        console.error("Error in Auth0 callback:", e);
        setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
        setIsProcessing(false);
      }
    };
    
    processAuthCallback();
  }, []);
  
  if (isProcessing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Processing your login...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ mt: 5, p: 3, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          Authentication Error
        </Typography>
        <Typography variant="body1">
          {error}
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <a href="/">Return to home page</a>
        </Typography>
      </Box>
    );
  }
  
  if (isSuccess) {
    return <Navigate to="/" replace />;
  }
  
  return <Navigate to="/" replace />;
};

export default Auth0Callback; 