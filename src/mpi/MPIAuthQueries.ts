const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://localhost:5100';

// Check login status via the mpi_session httpOnly cookie (sent automatically)
export const checkLoginStatus = async (): Promise<{ loggedIn: boolean; userInfo?: any }> => {
  try {
    const response = await fetch(`${backendUrl}/mpi/status`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { loggedIn: false };
    }

    const data = await response.json();
    return data?.loggedIn ? { loggedIn: true, userInfo: data.userInfo } : { loggedIn: false };
  } catch (e) {
    console.error('Error checking login status:', e);
    return { loggedIn: false };
  }
};

// Handle the OAuth callback by exchanging code for token (sets cookie on response)
export const handleLoginCallback = async (): Promise<boolean> => {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      console.error('Missing code or state in callback');
      return false;
    }

    const response = await fetch(`${backendUrl}/mpi/token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error in handleLoginCallback:', error);
    return false;
  }
};

// Logout (clears the mpi_session cookie server-side)
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${backendUrl}/mpi/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.error('Error during logout:', e);
  }
};
