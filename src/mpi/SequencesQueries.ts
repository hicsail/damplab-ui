import { gql } from '@apollo/client';
import type { ApolloClient } from '@apollo/client';
import type { ScreeningResult, Sequence } from './types';

/** Must match backend `MAX_MPI_SEQUENCE_BATCH` and MPI SecureDNA batch limit. */
export const MAX_MPI_SEQUENCE_BATCH = 100;

export const GET_ORG_SCREENINGS = gql`
  query OrgScreenings {
    orgScreenings {
      id
      sequence {
        id
        name
        seq
        type
        annotations {
          start
          end
          type
          description
        }
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

export const CREATE_SEQUENCES_BATCH = gql`
  mutation CreateSequencesBatch($input: BatchCreateSequencesInput!) {
    createSequencesBatch(input: $input) {
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

const ORG_SCREENINGS_REFETCH = [{ query: GET_ORG_SCREENINGS }] as const;

export const createSequencesBatch = async (
  client: ApolloClient<object>,
  sequences: Sequence[]
): Promise<Sequence[]> => {
  const result = await client.mutate({
    mutation: CREATE_SEQUENCES_BATCH,
    variables: {
      input: {
        sequences: sequences.map((s) => ({
          name: s.name,
          type: s.type || 'unknown',
          seq: s.seq,
          annotations: s.annotations || []
        }))
      }
    }
  });
  if (!result.data?.createSequencesBatch) {
    throw new Error('Failed to create sequences');
  }
  return result.data.createSequencesBatch;
};

export const screenSequencesBatch = async (
  client: ApolloClient<object>,
  sequenceIds: string[],
  region: string,
  providerReference?: string
): Promise<ScreeningResult[]> => {
  const result = await client.mutate({
    mutation: SCREEN_SEQUENCES_BATCH,
    variables: {
      input: {
        sequenceIds,
        region,
        ...(providerReference?.trim() ? { providerReference: providerReference.trim() } : {})
      }
    },
    refetchQueries: [...ORG_SCREENINGS_REFETCH]
  });
  const rows = result.data?.screenSequencesBatch;
  if (!Array.isArray(rows)) {
    throw new Error('Failed to complete screening');
  }
  return rows as ScreeningResult[];
};
