import { Sequence } from "./models/sequence";

// Helper function to get the session token
const getSessionToken = (): string | null => {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhdXRoMHw2NzgwNjM2MjJiOWY2OWQzMzc2ZjY4NDciLCJuYW1lIjoiY2hyaXN0b3BoZXIua3JlbnpAbGF0dGljZWF1dG9tYXRpb24uY29tIiwiZW1haWwiOiJjaHJpc3RvcGhlci5rcmVuekBsYXR0aWNlYXV0b21hdGlvbi5jb20iLCJpYXQiOjE3NDEyNDg2NzAsImV4cCI6MTc0MTMzNTA3MH0.yR2J1DZWN45RNIUNYDhbAaTXwctJEtXpHk8hfKHTqZk';
  // const token = localStorage.getItem('session_token');
  
  // if (!token) {
  //   console.log("No token found in localStorage");
  //   return null;
  // }
  
  // // Check if token has expired
  // const expiresAt = localStorage.getItem('token_expires_at');
  // if (expiresAt && new Date(expiresAt) < new Date()) {
  //   console.log("Token has expired, removing from localStorage");
  //   localStorage.removeItem('session_token');
  //   localStorage.removeItem('token_expires_at');
  //   return null;
  // }
  
  // return token;
};

export const getAllSequences = async (): Promise<Sequence[] | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": token ? `Bearer ${token}` : '',
      },
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = await data["message"];
      console.log(message);
    }
  } catch (e) {
    console.log(e);
  }
};

export const createSequence = async (sequence: Sequence): Promise<Sequence | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(sequence),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = await data["message"];
      console.log(message);
    }
  } catch (e) {
    console.log(e);
  }
};

export const updateSequence = async (sequenceId: string, sequence: Partial<Sequence>) => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences/${sequenceId}`, {
      method: "PATCH",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(sequence),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = await data["message"];
      console.log(message);
    }
  } catch (e) {
    console.log(e);
  }
};

export const deleteSequence = async (sequenceId: string) => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences/${sequenceId}`, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": token ? `Bearer ${token}` : '',
      },
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = await data["message"];
      console.log(message);
    }
  } catch (e) {
    console.log(e);
  }
};

export const createSequencesBatch = async (sequences: Sequence[]): Promise<{ message: string; status: string; timestamp: string } | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences/batch`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(sequences),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = await data["message"];
      console.log(message);
    }
  } catch (e) {
    console.log(e);
  }
};

// Add a function to handle the login callback
export const handleLoginCallback = async (code: string): Promise<boolean> => {
  try {
    console.log("Handling login callback with code:", code?.substring(0, 5) + "...");
    
    // Build the URL for the auth callback
    const callbackUrl = `${process.env.REACT_APP_BACKEND_MPI}/auth0_redirect?code=${encodeURIComponent(code)}`;
    console.log("Calling backend at:", process.env.REACT_APP_BACKEND_MPI);
    
    // Make the fetch request
    console.log("Fetching token from backend...");
    const response = await fetch(callbackUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-type": "application/json; charset=UTF-8",
      },
    });
    
    console.log("Auth callback response status:", response.status);
    
    // Clone the response for examination
    const responseClone = response.clone();
    let responseText;
    try {
      responseText = await responseClone.text();
      console.log("Raw response:", responseText.substring(0, 100) + "...");
    } catch (e) {
      console.error("Failed to read response text:", e);
    }
    
    // If response is not OK, handle error
    if (!response.ok) {
      console.error("Backend error:", responseText || response.statusText);
      return false;
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      // If we already have the response text, parse it
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = await response.json();
      }
      console.log("Received response with token field:", Object.keys(data).includes('token'));
      console.log("Token field type:", typeof data.token);
      console.log("Available response fields:", Object.keys(data).join(', '));
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      return false;
    }
    
    // Validate and store the token
    if (data.token) {
      console.log("Storing token in localStorage");
      
      // Try to store in a try-catch block to catch potential issues
      try {
        localStorage.setItem('session_token', data.token);
        console.log("localStorage.setItem called for token");
        
        // Also store expiration if available
        if (data.expires_at) {
          localStorage.setItem('token_expires_at', data.expires_at);
        }
        
        // Verify token was stored
        const storedToken = localStorage.getItem('session_token');
        console.log("Verifying token storage - Token exists:", !!storedToken);
        console.log("Stored token length:", storedToken ? storedToken.length : 0);
        
        if (!storedToken) {
          console.error("Failed to store token in localStorage!");
          // As a fallback, try again with a simplified approach
          window.localStorage.setItem('session_token', String(data.token));
          const retryCheck = window.localStorage.getItem('session_token');
          console.log("Retry token storage - success:", !!retryCheck);
          
          return !!retryCheck;
        }
        
        return true;
      } catch (storageError) {
        console.error("Error storing token in localStorage:", storageError);
        console.log("Token type:", typeof data.token);
        console.log("Token value (partial):", 
          typeof data.token === 'string' ? data.token.substring(0, 20) + "..." : "Not a string");
        return false;
      }
    } else {
      console.error("No token in response:", data);
      return false;
    }
  } catch (e) {
    console.error("Authentication error:", e);
    console.error("Error details:", e instanceof Error ? e.message : String(e));
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
