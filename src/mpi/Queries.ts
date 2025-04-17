import { gql } from '@apollo/client';

export const GET_USER_SCREENINGS = gql`
  query GetUserScreenings {
    getUserScreenings {
      id
      sequence {
        id
        name
      }
      status
      threats {
        name
        description
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
        description
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
      message
      status
      timestamp
    }
  }
`; 