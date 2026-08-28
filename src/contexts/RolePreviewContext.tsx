import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@apollo/client/index.js';
import { GET_ROLE_PREVIEWS } from '../gql/queries';
import { UserContext } from './UserContext';
import { PERMISSIONS, canFor } from '../hooks/usePermissions';
import type { AccessTier } from '../constants/accessTiers';

export interface RolePreview {
  tier: AccessTier;
  label: string;
  permissions: string[];
}

interface RolePreviewContextProps {
  /** In dropdown order, as the server returned them. Empty for non-administrators. */
  previews: RolePreview[];
  /** The same, keyed for lookup by `useEffectiveUser`. */
  previewsByTier: Record<string, string[] | undefined>;
}

export const RolePreviewContext = createContext<RolePreviewContextProps>({
  previews: [],
  previewsByTier: {},
});

/**
 * The permission list for each access tier an administrator may preview.
 *
 * Fetched **once**, here, rather than inside `useEffectiveUser` — that hook runs in
 * effectively every gated component, and while Apollo would dedupe the request it
 * would still add a subscription per call site for a list that never changes within a
 * session.
 *
 * Deliberately not part of `UserContext`'s `myPermissions` fetch. That one runs during
 * module evaluation inside a top-level await, before Apollo exists, and its own
 * docblock records the hazard: asking a deployed backend for a field it does not yet
 * have fails the whole query and drops every caller to the legacy staff boolean. Here
 * a failure costs only the dropdown.
 *
 * Skipped entirely for non-administrators, whose `rolePreviews` call would 403 —
 * `customers:manage` gates it — and put a red error on an otherwise fine page.
 */
export function RolePreviewProvider({ children }: { children: React.ReactNode }) {
  const { userProps } = useContext(UserContext);
  // The same permission the query itself requires, read off the *unmasked* user —
  // this provider sits above the preview and must not be switched off by it.
  const isAdministrator = canFor(userProps, PERMISSIONS.CustomersManage);

  const { data } = useQuery(GET_ROLE_PREVIEWS, { skip: !isAdministrator, fetchPolicy: 'cache-first' });

  const value = useMemo(() => {
    const previews: RolePreview[] = data?.rolePreviews ?? [];
    const previewsByTier: Record<string, string[] | undefined> = {};
    for (const preview of previews) {
      previewsByTier[preview.tier] = preview.permissions;
    }
    return { previews, previewsByTier };
  }, [data]);

  return <RolePreviewContext value={value}>{children}</RolePreviewContext>;
}
