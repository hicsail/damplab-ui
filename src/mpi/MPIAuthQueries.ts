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
export const handleLoginCallback = async () => {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    if (!code || !state) {
      console.error("Missing code or state in callback");
      return false;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://127.0.0.1:5100';
    console.log("MPI Auth: Using backend URL:", backendUrl);
    const response = await fetch(`${backendUrl}/mpi/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    
    if (data && data.token) {
      localStorage.setItem('session_token', data.token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error in handleLoginCallback:", error);
    return false;
  }
};

// Add a function to check login status
export const checkLoginStatus = async (): Promise<{ loggedIn: boolean; userInfo?: any }> => {
  try {
    const token = getSessionToken();
    console.log("Checking login status, token exists:", !!token);
    
    if (!token) {
      console.log("No token found, not logged in");
      return { loggedIn: false };
    }
    
    // Try to decode the JWT to see if it's expired locally and log details
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const header = JSON.parse(atob(tokenParts[0]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        
        console.log("MPI Auth: Decoded JWT - userId:", payload.userId, "exp:", new Date(exp).toISOString(), "alg:", header.alg);
        
        if (Date.now() > exp) {
          console.log("Token expired according to JWT payload");
          localStorage.removeItem('session_token');
          localStorage.removeItem('token_expires_at');
          localStorage.removeItem('user_info');
          return { loggedIn: false };
        }
      } else {
        console.error("MPI Auth: Token doesn't have 3 parts, invalid JWT format");
      }
    } catch (e) {
      console.error("MPI Auth: Error decoding JWT:", e);
    }
    
    // Verify the token with the backend using REST
    const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://127.0.0.1:5100';
    console.log("MPI Auth: Checking status with backend URL:", backendUrl);
    const response = await fetch(`${backendUrl}/mpi/status`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    
    console.log("MPI Auth: Status response status:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("MPI Auth: Status check failed:", response.status, errorText);
      throw new Error(`Failed to check login status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("MPI Auth: Status response data:", data);
    
    if (data?.loggedIn) {
      console.log("MPI Auth: Login successful, userInfo:", data.userInfo);
      return { loggedIn: true, userInfo: data.userInfo };
    }
    
    // If we get here, we're not logged in
    console.log("MPI Auth: Backend returned loggedIn: false");
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user_info');
    return { loggedIn: false };
  } catch (e) {
    console.error("Error checking login status:", e);
    return { loggedIn: false };
  }
};

// Add a function to handle logout
export const logout = async (): Promise<void> => {
  try {
    const token = getSessionToken();
    if (token) {
      const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://127.0.0.1:5100';
      await fetch(`${backendUrl}/mpi/logout`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`
        }
      });
    }
    
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
      }
    } catch (e) {
      console.error("DEBUG - Error decoding token:", e);
    }
  }
};
