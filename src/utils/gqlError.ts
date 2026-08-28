import { ApolloError } from '@apollo/client';

/**
 * Turn a caught mutation error into something worth showing a user.
 *
 * The reason this exists rather than each page writing "Unable to save. Please try
 * again.": with permissions enforced server-side, a large share of save failures
 * are now 403s, and "please try again" is actively wrong for those — retrying never
 * works. Surfacing `graphQLErrors[0].message` puts the server's own
 * "Missing permission: catalog-editor:write" in front of the user instead.
 *
 * Extracted from AdminEditInventoryItem, which was the one page in the tree doing
 * this properly.
 */
export function formatGqlError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApolloError) {
    const gqlMessage = error.graphQLErrors?.[0]?.message;
    if (gqlMessage) return gqlMessage;
    if (error.networkError) {
      const networkError = error.networkError as { statusCode?: number; message?: string };
      return `Network error${networkError.statusCode ? ` (HTTP ${networkError.statusCode})` : ''}: ${networkError.message ?? 'request failed'}`;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * True when the failure was an authorization refusal rather than a transient
 * problem. Lets a caller say "you do not have permission to do this" instead of
 * offering a retry that cannot succeed.
 */
export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof ApolloError)) return false;
  return error.graphQLErrors?.some((gqlError) => {
    const code = (gqlError.extensions as { code?: string } | undefined)?.code;
    return code === 'FORBIDDEN' || /^Missing permission:/.test(gqlError.message) || /required role/i.test(gqlError.message);
  });
}

/** `formatGqlError`, prefixed for a save action, with a permission-aware message. */
export function formatSaveError(error: unknown, noun = 'changes'): string {
  if (isPermissionError(error)) {
    return `You do not have permission to save ${noun}. ${formatGqlError(error)}`;
  }
  return `Save failed: ${formatGqlError(error, `Unable to save ${noun}. Please try again.`)}`;
}
