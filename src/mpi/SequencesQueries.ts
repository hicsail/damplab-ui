import { Sequence } from "./models/sequence";

export const getAllSequences = async (): Promise<Sequence[] | undefined> => {
  try {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
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
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
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
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences/${sequenceId}`, {
      method: "PATCH",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
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
    const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/sequences/${sequenceId}`, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
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
