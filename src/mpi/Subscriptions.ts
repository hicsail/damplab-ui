import { ApolloClient, gql } from '@apollo/client';
import { ScreeningResult } from './types';

const ON_SCREENING_STATUS = gql`
  subscription OnScreeningStatus($sequenceId: String!) {
    screeningStatus(sequenceId: $sequenceId) {
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

export const subscribeToScreeningResults = (
  client: ApolloClient<any>,
  onData: (result: ScreeningResult) => void
) => {
  const subscriptions: { unsubscribe: () => void }[] = [];

  // Get all screening results to find sequences being screened
  client.query({
    query: gql`
      query GetScreeningResults {
        getUserScreenings {
          id
          sequence {
            id
            name
          }
          status
        }
      }
    `
  }).then(({ data }) => {
    // Subscribe to updates for sequences that are being screened
    data.getUserScreenings.forEach((screening: { sequence: { id: string }; status: string }) => {
      if (screening.status === 'pending' || screening.status === 'completed' || screening.status === 'failed') {
        const subscription = client.subscribe({
          query: ON_SCREENING_STATUS,
          variables: {
            sequenceId: screening.sequence.id
          }
        }).subscribe({
          next({ data }) {
            if (data?.screeningStatus) {
              onData(data.screeningStatus);
            }
          },
          error(error) {
            console.error('Subscription error:', error);
          }
        });
        subscriptions.push(subscription);
      }
    });
  }).catch(error => {
    console.error('Error fetching screening results:', error);
  });

  return {
    unsubscribe: () => subscriptions.forEach(sub => sub.unsubscribe())
  };
};

export default {};