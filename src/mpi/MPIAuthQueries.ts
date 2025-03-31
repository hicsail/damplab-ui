import { gql } from '@apollo/client';
import { ApolloClient } from '@apollo/client';

// GraphQL queries and mutations
export const IS_LOGGED_IN = gql`
  query IsLoggedIn {
    isLoggedIn {
      loggedIn
      userInfo {
        sub
        name
        email
        picture
      }
    }
  }
`;

export const GET_USER_INFO = gql`
  query GetUserInfo {
    getUserInfo {
      sub
      name
      email
      picture
    }
  }
`;

export const EXCHANGE_CODE_FOR_TOKEN = gql`
  mutation ExchangeCodeForToken($code: String!, $state: String!) {
    exchangeCodeForToken(code: $code, state: $state) {
      token
      userInfo {
        sub
        name
        email
        picture
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

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
export const handleLoginCallback = async (client: ApolloClient<any>) => {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    if (!code || !state) {
      console.error("Missing code or state in callback");
      return false;
    }
    
    const { data } = await client.mutate({
      mutation: EXCHANGE_CODE_FOR_TOKEN,
      variables: { code, state }
    });
    
    if (data?.exchangeCodeForToken?.token) {
      localStorage.setItem('session_token', data.exchangeCodeForToken.token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error in handleLoginCallback:", error);
    return false;
  }
};

// Add a function to check login status
export const checkLoginStatus = async (client: any): Promise<boolean> => {
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
    
    // Verify the token with the backend using GraphQL
    const { data } = await client.query({
      query: IS_LOGGED_IN,
      context: {
        headers: {
          authorization: `Bearer ${token}`
        }
      }
    });
    
    if (data?.isLoggedIn?.loggedIn) {
      return true;
    }
    
    // If we get here, we're not logged in
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user_info');
    return false;
  } catch (e) {
    console.error("Error checking login status:", e);
    return false;
  }
};

// Add a function to handle logout
export const logout = async (client: any): Promise<void> => {
  try {
    const token = getSessionToken();
    if (token) {
      await client.mutate({
        mutation: LOGOUT,
        context: {
          headers: {
            authorization: `Bearer ${token}`
          }
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
      } else {
        console.log("DEBUG - Not a standard JWT (doesn't have 3 parts)");
      }
    } catch (e) {
      console.error("DEBUG - Failed to decode token:", e);
    }
  }
};
