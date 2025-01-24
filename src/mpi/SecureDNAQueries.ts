// TODO: add types
export const screenSequence = async (ids: string[]) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/securedna/run-screening`, {
        method: "PATCH",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ ids: ids }),
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
  
  export const getSecureDNAScreenings = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/securedna/screens`, {
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
  
  export const updateSecureDNAScreening = async (id: string | undefined, status: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/securedna/screen`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: id, adminStatus: status }),
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

  export const screenSequencesBatch = async (ids: string[]): Promise<{ message: string; status: string; timestamp: string } | undefined> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/securedna/run-screening/batch`, {
        method: "PATCH",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ ids: ids }),
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
  