import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { ADD_JOB_MEMBER, REMOVE_JOB_MEMBER, SET_JOB_DESCRIPTION } from '../gql/mutations';
import { formatGqlError } from '../utils/gqlError';

/** Wires the job page's people and description controls to the server; refetches the job after each change. */
export function useJobCollaboration(jobId?: string, onChanged?: () => Promise<unknown> | void) {
  const [addJobMember] = useMutation(ADD_JOB_MEMBER);
  const [removeJobMember] = useMutation(REMOVE_JOB_MEMBER);
  const [setJobDescription] = useMutation(SET_JOB_DESCRIPTION);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string): Promise<void> => {
    if (!jobId) return;
    setError(null);
    try {
      await action();
      await onChanged?.();
    } catch (err) {
      setError(formatGqlError(err, fallback));
      throw err;
    }
  };

  return {
    addMember: (email: string) => run(() => addJobMember({ variables: { jobId, email } }), 'That person could not be added.'),
    removeMember: (email: string) => run(() => removeJobMember({ variables: { jobId, email } }), 'That person could not be removed.'),
    saveDescription: (description: string | null) => run(() => setJobDescription({ variables: { jobId, description } }), 'The description could not be saved.'),
    error,
    clearError: () => setError(null)
  };
}
