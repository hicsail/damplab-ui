export const screenSequence = async (submissionName: string, sequences: any) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/aclid/run-screening`, {
            method: "POST",
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                submissionName: submissionName,
                sequences: sequences
            }),
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
  
export const getAclidScreenings = async () => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/aclid/screens`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            throw new Error('Failed to get Aclid data');
        }
        
        const data = await response.json();
        console.log('aclid data: ', data);
        return data;

    } catch (err) {
        console.error(err);
        return undefined;
    }
};

export const getAclidScreeningDetails = async (id: string) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/aclid/screen`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({id: id}),
        });

        if (!response.ok) {
            throw new Error('Failed to get Aclid data');
        }
        
        const data = await response.json();
        console.log('aclid data: ', data);
        return data;

    } catch (err) {
        console.error(err);
        return undefined;
    }
};
