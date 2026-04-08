import { ScreeningInput, ScreeningResult, Region } from "./types";

const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://127.0.0.1:5100';

export const screenSequence = async (sequenceId: string, region: string): Promise<ScreeningResult | undefined> => {
  try {
    const response = await fetch(`${backendUrl}/secure-dna/screen`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sequenceId,
        region,
      } as ScreeningInput),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = data.message;
      console.error(message);
    }
  } catch (e) {
    console.error(e);
  }
};

export const getScreeningResults = async (sequenceId: string): Promise<ScreeningResult[] | undefined> => {
  try {
    const response = await fetch(`${backendUrl}/secure-dna/screen/${sequenceId}`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = data.message;
      console.error(message);
    }
  } catch (e) {
    console.error(e);
  }
};

export const getUserScreenings = async (): Promise<ScreeningResult[] | undefined> => {
  try {
    const response = await fetch(`${backendUrl}/secure-dna/screenings`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = data.message;
      console.error(message);
    }
  } catch (e) {
    console.error(e);
  }
};

export const screenSequencesBatch = async (sequenceIds: string[], region: Region): Promise<{ message: string; status: string; timestamp: string } | undefined> => {
  try {
    const response = await fetch(`${backendUrl}/secure-dna/screen/batch`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sequenceIds,
        region,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      const message = data.message;
      console.error(message);
    }
  } catch (e) {
    console.error(e);
  }
};
