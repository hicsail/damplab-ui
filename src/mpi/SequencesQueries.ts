import { Sequence } from "./models/sequence";
import { getSessionToken } from "./MPIAuthQueries";

export const getAllSequences = async (): Promise<Sequence[] | undefined> => {
  try {
    const token = getSessionToken();
    if (!token) {
      throw new Error('No valid session token found');
    }

    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/mpi/sequences`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid or expired
        localStorage.removeItem('session_token');
        localStorage.removeItem('token_expires_at');
        throw new Error('Session expired, please log in again');
      }
      const data = await response.json();
      throw new Error(data.message || 'Failed to fetch sequences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sequences:', error);
    throw error;
  }
};

export const createSequence = async (sequence: Sequence): Promise<Sequence | undefined> => {
  try {
    const token = getSessionToken();
    if (!token) {
      throw new Error('No valid session token found');
    }

    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/mpi/sequences`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(sequence),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('token_expires_at');
        throw new Error('Session expired, please log in again');
      }
      const data = await response.json();
      throw new Error(data.message || 'Failed to create sequence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating sequence:', error);
    throw error;
  }
};

export const updateSequence = async (sequenceId: string, sequence: Partial<Sequence>) => {
  try {
    const token = getSessionToken();
    if (!token) {
      throw new Error('No valid session token found');
    }

    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/mpi/sequences/${sequenceId}`, {
      method: "PATCH",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(sequence),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('token_expires_at');
        throw new Error('Session expired, please log in again');
      }
      const data = await response.json();
      throw new Error(data.message || 'Failed to update sequence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating sequence:', error);
    throw error;
  }
};

export const deleteSequence = async (sequenceId: string) => {
  try {
    const token = getSessionToken();
    if (!token) {
      throw new Error('No valid session token found');
    }

    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/mpi/sequences/${sequenceId}`, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('token_expires_at');
        throw new Error('Session expired, please log in again');
      }
      const data = await response.json();
      throw new Error(data.message || 'Failed to delete sequence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting sequence:', error);
    throw error;
  }
};

export const createSequencesBatch = async (sequences: Sequence[]): Promise<{ message: string; status: string; timestamp: string } | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/mpi/sequences/batch`, {
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
