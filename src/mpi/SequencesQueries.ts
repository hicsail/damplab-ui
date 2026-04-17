import { gql } from '@apollo/client';
import type { ApolloClient } from '@apollo/client';
import type { ScreeningBatch, Sequence } from './types';

/** Must match backend `MAX_MPI_SEQUENCE_BATCH` and MPI SecureDNA batch limit. */
export const MAX_MPI_SEQUENCE_BATCH = 1000;

const SEQUENCE_FIELDS = `
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
  userId
  mpiId
  created_at
  updated_at
`;

const SCREENING_BATCH_FIELDS = `
  id
  mpiBatchId
  mpiCreatedAt
  synthesisPermission
  region
  providerReference
  hitsByRecord {
    fasta_header
    line_number_range
    sequence_length
    hits_by_hazard {
      type
      is_wild_type
      hit_regions {
        seq
        seq_range_start
        seq_range_end
      }
      most_likely_organism {
        name
        organism_type
        ans
        tags
      }
      organisms {
        name
        organism_type
        ans
        tags
      }
    }
  }
  warnings {
    diagnostic
    additional_info
    line_number_range
  }
  errors {
    diagnostic
    additional_info
    line_number_range
  }
  verifiable {
    synthclient_version
    response_json
    signature
    public_key
    history
    sha3_256
  }
  sequences {
    sequence {
      ${SEQUENCE_FIELDS}
    }
    mpiSequenceId
    name
    order
    originalSeq
    threats {
      type
      is_wild_type
      hit_regions {
        seq
        seq_range_start
        seq_range_end
      }
      most_likely_organism {
        name
        organism_type
        ans
        tags
      }
      organisms {
        name
        organism_type
        ans
        tags
      }
    }
    warning
  }
  userId
  created_at
  updated_at
`;

export const GET_ORG_SCREENINGS = gql`
  query OrgScreenings {
    orgScreenings {
      ${SCREENING_BATCH_FIELDS}
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
      ${SCREENING_BATCH_FIELDS}
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
): Promise<ScreeningBatch> => {
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
  const batch = result.data?.screenSequencesBatch;
  if (!batch || typeof batch !== 'object') {
    throw new Error('Failed to complete screening');
  }
  return batch as ScreeningBatch;
};
