import { describe, expect, it } from 'vitest';
import { ApolloError } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { formatGqlError, formatSaveError, isPermissionError } from './gqlError';

const apolloWith = (message: string, code?: string) =>
  new ApolloError({ graphQLErrors: [new GraphQLError(message, { extensions: code ? { code } : undefined })] });

describe('formatGqlError', () => {
  it("surfaces the server's own message rather than a generic retry prompt", () => {
    expect(formatGqlError(apolloWith('Missing permission: catalog-editor:write'))).toBe('Missing permission: catalog-editor:write');
  });

  it('describes a network failure with its status code', () => {
    const error = new ApolloError({ networkError: Object.assign(new Error('Failed to fetch'), { statusCode: 502 }) });
    expect(formatGqlError(error)).toBe('Network error (HTTP 502): Failed to fetch');
  });

  it('falls back for a non-Apollo throw', () => {
    expect(formatGqlError({ not: 'an error' }, 'fallback text')).toBe('fallback text');
  });

  it('uses a plain Error message when there is one', () => {
    expect(formatGqlError(new Error('boom'))).toBe('boom');
  });
});

describe('isPermissionError', () => {
  it('recognises a FORBIDDEN extension code', () => {
    expect(isPermissionError(apolloWith('nope', 'FORBIDDEN'))).toBe(true);
  });

  it("recognises the guard's message shape without an extension code", () => {
    expect(isPermissionError(apolloWith('Missing permission: lab-layout:write'))).toBe(true);
    expect(isPermissionError(apolloWith('You do not have the required role'))).toBe(true);
  });

  it('does not treat an ordinary validation failure as a permission problem', () => {
    expect(isPermissionError(apolloWith('Name is required.', 'BAD_USER_INPUT'))).toBe(false);
  });

  it('is false for a network error — retrying that one can work', () => {
    expect(isPermissionError(new ApolloError({ networkError: new Error('offline') }))).toBe(false);
  });
});

describe('formatSaveError', () => {
  it('never offers a retry for a refusal, because retrying cannot succeed', () => {
    const message = formatSaveError(apolloWith('Missing permission: inventory:write'), 'this item');
    expect(message).toContain('do not have permission');
    expect(message).not.toContain('try again');
  });

  it('does offer one for a transient failure', () => {
    expect(formatSaveError(new ApolloError({ networkError: new Error('offline') }), 'the station')).toContain('Network error');
  });
});
