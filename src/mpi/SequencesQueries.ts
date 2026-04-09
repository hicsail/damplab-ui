import { gql } from '@apollo/client';
import { Sequence } from './types';

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
      providerReference
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
      providerReference
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

export const screenSequencesBatch = async (
  client: any,
  sequenceIds: string[],
  region: string,
  providerReference?: string
): Promise<any> => {
  try {
    const result = await client.mutate({
      mutation: SCREEN_SEQUENCES_BATCH,
      variables: {
        input: {
          sequenceIds,
          region,
          ...(providerReference?.trim() ? { providerReference: providerReference.trim() } : {})
        }
      }
    });
    return result.data.screenSequencesBatch;
  } catch (error) {
    console.error('Error screening sequences batch:', error);
    throw error;
  }
};
