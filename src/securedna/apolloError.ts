import { ApolloError } from '@apollo/client';

/** User-visible message from a failed GraphQL operation. */
export function formatApolloError(error: unknown): string {
  if (error instanceof ApolloError) {
    const gqlMsgs = error.graphQLErrors?.map((e) => e.message).filter(Boolean);
    if (gqlMsgs?.length) {
      return gqlMsgs.join(' ');
    }
    if (error.networkError && error.networkError instanceof Error) {
      return error.networkError.message;
    }
    return error.message || 'Request failed';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
