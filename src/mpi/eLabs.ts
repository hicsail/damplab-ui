const api_url = process.env.REACT_APP_MPI_API || '';

type ELabsStudyResponse = {
  studyID      : number;
  projectID    : number;
  groupID      : number;
  subGroupID   : number;
  userID       : number;
  name         : string;
  statusChanged: string;
  description  : string;
  notes        : string;
  approve      : string;
  created      : string;
  deleted      : boolean;
};

type eLabsStatus = 'PENDING' | 'PROGRESS' | 'COMPLETED';

type ELabsExperimentResponse = {
  bearerToken     : string,
  experimentID    : number,
  studyID         : number,
  name            : string,
  status          : eLabsStatus,
  templateID?     : number,
  autoCollaborate?: boolean
}


export const createELabsStudy = async (bearerToken: string, projectID: number, name: string): Promise<number | undefined> => {
  try {
    console.log('FROM DAMP name: ', name)

    const response = await fetch(api_url.concat('/e-labs/create-study'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        bearerToken: bearerToken,
        name: name,
        projectID: projectID,
      }),
    });

    if (!response.ok) {
      throw new Error('Error creating eLabs Study from Canvas Workflow...');
    }

    const data: ELabsStudyResponse = await response.json();
    return data.studyID;

  } catch (e) {
    console.log(e);
    return undefined;
  }
};


export const createELabsExperiment = async (bearerToken: string, studyID: number, name: string, status: eLabsStatus, templateID?: number, autoCollaborate?: boolean): Promise<number | undefined> => {
  try {
    const response = await fetch(api_url.concat('/e-labs/create-experiment'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        bearerToken    : bearerToken,
        studyID        : studyID,
        name           : name,
        status         : status,
        templateID     : templateID,
        autoCollaborate: autoCollaborate
      }),
    });

    if (!response.ok) {
      throw new Error('Error creating eLabs Experiment from Canvas Service...');
    }

    const data: ELabsExperimentResponse = await response.json();

    if (!data.experimentID || data.experimentID === undefined) {
      throw new Error('ExperimentID not returned by eLabs (or invalid)...');
    }

    return data.experimentID;

  } catch (e) {
    console.log(e);
    return undefined;
  }
};
