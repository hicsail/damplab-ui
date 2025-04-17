import { gql } from '@apollo/client';
import { Sequence } from './types';
import { getSessionToken } from "./MPIAuthQueries";
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';

export const GET_SEQUENCES = gql`
  query GetSequences {
    sequences {
      id
      name
      type
      seq
      annotations {
        start
        end
        type
        description
      }
      userId
      mpiId
      created_at
      updated_at
    }
  }
`;

export const GET_USER_SCREENINGS = gql`
  query GetUserScreenings {
    getUserScreenings {
      id
      sequence {
        id
        name
        seq
        type
      }
      status
      threats {
        name
        hit_regions {
          seq
          seq_range_start
          seq_range_end
        }
        is_wild_type
        references
      }
      region
      created_at
      updated_at
      userId
    }
  }
`;

export const CREATE_SEQUENCE = gql`
  mutation CreateSequence($input: CreateSequenceInput!) {
    createSequence(input: $input) {
      id
      name
      type
      seq
      annotations {
        start
        end
        type
        description
      }
      userId
      mpiId
      created_at
      updated_at
    }
  }
`;

export const DELETE_SEQUENCE = gql`
  mutation DeleteSequence($id: String!) {
    deleteSequence(id: $id)
  }
`;

export const SCREEN_SEQUENCE = gql`
  mutation ScreenSequence($input: ScreeningInput!) {
    screenSequence(input: $input) {
      id
      sequence {
        id
        name
      }
      status
      threats {
        name
        hit_regions {
          seq
          seq_range_start
          seq_range_end
        }
        is_wild_type
        references
      }
      region
      created_at
      updated_at
      userId
    }
  }
`;

export const SCREEN_SEQUENCES_BATCH = gql`
  mutation ScreenSequencesBatch($input: BatchScreeningInput!) {
    screenSequencesBatch(input: $input) {
      id
      sequence {
        id
        name
      }
      status
      threats {
        name
        hit_regions {
          seq
          seq_range_start
          seq_range_end
        }
        is_wild_type
        references
      }
      region
      created_at
      updated_at
      userId
    }
  }
`;

export const UPDATE_SEQUENCE = gql`
  mutation UpdateSequence($id: String!, $input: CreateSequenceInput!) {
    updateSequence(id: $id, input: $input) {
      id
      name
      sequence
      createdAt
      updatedAt
    }
  }
`;

export const getAllSequences = async (client: any): Promise<Sequence[] | undefined> => {
  try {
    const result = await client.query({
      query: GET_SEQUENCES
    });
    return result.data.sequences;
  } catch (error) {
    console.error('Error fetching sequences:', error);
    throw error;
  }
};

export const createSequence = async (client: any, sequence: Sequence): Promise<Sequence | undefined> => {
  try {
    const result = await client.mutate({
      mutation: CREATE_SEQUENCE,
      variables: {
        input: {
          name: sequence.name,
          type: sequence.type || 'unknown',
          seq: sequence.seq,
          annotations: sequence.annotations || []
        }
      }
    });
    return result.data.createSequence;
  } catch (error) {
    console.error('Error creating sequence:', error);
    throw error;
  }
};

export const updateSequence = async (client: ApolloClient<NormalizedCacheObject>, id: string, sequence: Partial<Sequence>): Promise<Sequence> => {
  try {
    const { data } = await client.mutate<{ updateSequence: Sequence }>({
      mutation: UPDATE_SEQUENCE,
      variables: {
        id,
        input: sequence
      }
    });
    return data!.updateSequence;
  } catch (error) {
    console.error('Error updating sequence:', error);
    throw error;
  }
};

export const deleteSequence = async (client: any, sequenceId: string): Promise<boolean> => {
  try {
    const result = await client.mutate({
      mutation: DELETE_SEQUENCE,
      variables: { id: sequenceId }
    });
    return result.data.deleteSequence;
  } catch (error) {
    console.error('Error deleting sequence:', error);
    throw error;
  }
};

export const createSequencesBatch = async (sequences: Sequence[]): Promise<{ message: string; status: string; timestamp: string } | undefined> => {
  try {
    const token = getSessionToken();
    const response = await fetch(`${process.env.REACT_APP_BACKEND_BASEURL}/mpi/sequences/batch`, {
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

export const screenSequence = async (client: any, sequenceId: string, region: string): Promise<any> => {
  try {
    const result = await client.mutate({
      mutation: SCREEN_SEQUENCE,
      variables: {
        input: {
          sequenceId,
          region
        }
      }
    });
    return result.data.screenSequence;
  } catch (error) {
    console.error('Error screening sequence:', error);
    throw error;
  }
};

export const screenSequencesBatch = async (client: any, sequenceIds: string[], region: string): Promise<any> => {
  try {
    const result = await client.mutate({
      mutation: SCREEN_SEQUENCES_BATCH,
      variables: {
        input: {
          sequenceIds,
          region
        }
      }
    });
    return result.data.screenSequencesBatch;
  } catch (error) {
    console.error('Error screening sequences batch:', error);
    throw error;
  }
};
