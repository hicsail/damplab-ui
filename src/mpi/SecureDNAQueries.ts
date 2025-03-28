import { getSessionToken } from "./MPIAuthQueries";
import { ScreeningInput, ScreeningResult, Region } from "./types";

export const screenSequence = async (sequenceId: string, region: string): Promise<ScreeningResult | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/secure-dna/screen`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
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
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/secure-dna/screen/${sequenceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
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
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/secure-dna/screenings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
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
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/secure-dna/screen/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
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
  