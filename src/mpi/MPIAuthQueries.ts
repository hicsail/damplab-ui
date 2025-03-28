// Helper function to get the session token
export const getSessionToken = (): string | null => {
  const token = localStorage.getItem('session_token');
  
  if (!token) {
    console.log("No token found in localStorage");
    return null;
  }
  
  // Check if token has expired
  const expiresAt = localStorage.getItem('token_expires_at');
  if (expiresAt && new Date(expiresAt) < new Date()) {
    console.log("Token has expired, removing from localStorage");
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    return null;
  }
  
  return token;
};


// Update the handleLoginCallback function
export const handleLoginCallback = async (): Promise<boolean> => {
    try {
      // Check if we have an error in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      if (error) {
        console.error('Auth error:', error);
        return false;
      }
  
      // The backend will handle the Auth0 callback and set the session cookie
      // We just need to redirect to the home page
      window.location.href = '/';
      return true;
    } catch (error) {
      console.error('Login callback error:', error);
      return false;
    }
  };
  
  // Add a function to check login status
  export const checkLoginStatus = async (): Promise<boolean> => {
    try {
      const token = getSessionToken();
      console.log("Checking login status, token exists:", !!token);
      
      if (!token) {
        console.log("No token found, not logged in");
        return false;
      }
      
      // Try to decode the JWT to see if it's expired locally
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const exp = payload.exp * 1000; // Convert to milliseconds
          
          if (Date.now() > exp) {
            console.log("Token expired according to JWT payload");
            localStorage.removeItem('session_token');
            localStorage.removeItem('token_expires_at');
            localStorage.removeItem('user_info');
            return false;
          }
        }
      } catch (e) {
        console.error("Error decoding JWT:", e);
      }
      
      // Verify the token with the backend
      console.log("Verifying token with backend");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/is_logged_in`, {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${token}`
        },
      });
      
      console.log("Login status response:", response.status);
      
      if (response.status === 401) {
        console.log("Token rejected by server, clearing local storage");
        // If we get a 401, clear the token as it's likely invalid
        localStorage.removeItem('session_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('user_info');
        return false;
      }
      
      if (!response.ok) {
        console.error("Error checking login status:", response.status);
        return false;
      }
      
      const data = await response.json();
      console.log("Login check result:", data);
      return data.loggedIn === true;
    } catch (e) {
      console.error("Error checking login status:", e);
      return false;
    }
  };
  
  // Add a function to handle logout
  export const logout = async (): Promise<void> => {
    try {
      const token = getSessionToken();
      await fetch(`${process.env.REACT_APP_BACKEND_MPI}/auth0_logout`, {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": token ? `Bearer ${token}` : '',
        },
      });
      
      // Clean up all auth-related items
      localStorage.removeItem('session_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user_info');
      localStorage.removeItem('auth_state');
    } catch (e) {
      console.error("Error during logout:", e);
    }
  };
  
  // Helper function to check token directly - useful for debugging
  export const debugCheckToken = (): void => {
    const token = localStorage.getItem('session_token');
    console.log("DEBUG - Token exists:", !!token);
    
    if (token) {
      console.log("DEBUG - Token length:", token.length);
      console.log("DEBUG - Token starts with:", token.substring(0, 20) + "...");
      
      try {
        // Try to decode the JWT and log parts
        const parts = token.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));
          
          console.log("DEBUG - Token type:", header.typ);
          console.log("DEBUG - Token alg:", header.alg);
          console.log("DEBUG - Token subject:", payload.sub);
          console.log("DEBUG - Token issuer:", payload.iss);
          console.log("DEBUG - Token exp:", new Date(payload.exp * 1000).toISOString());
        } else {
          console.log("DEBUG - Not a standard JWT (doesn't have 3 parts)");
        }
      } catch (e) {
        console.error("DEBUG - Failed to decode token:", e);
      }
    }
  };
