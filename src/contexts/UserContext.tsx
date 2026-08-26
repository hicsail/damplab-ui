import { createContext } from "react";
import Keycloak from "keycloak-js";
import { CustomerCategory, deriveCustomerCategory, isExternalCustomerClaims, isInternalCustomerClaims } from "../utils/customerCategory";

export interface UserContextProps {
  keycloak: any;
  userProps: UserProps;
}
export interface UserProps {
  isAuthenticated: boolean;
  isDamplabStaff?: boolean;
  /**
   * Resolved server-side by the `myPermissions` query. The role -> permission table
   * lives only in the backend: the two packages share no code, so a copy here would
   * drift. The UI asks for the answer instead of computing it.
   */
  permissions?: string[];
  /**
   * The same list with staff-flavoured roles removed — what the Client View toggle
   * previews. `useEffectiveUser` swaps `permissions` for this. A UI illusion: the
   * real token is unchanged and retains full backend authority.
   */
  customerPermissions?: string[];
  /**
   * False when the permissions fetch failed. `usePermissions` falls back to the
   * legacy staff boolean in that case rather than hiding everything.
   */
  permissionsLoaded?: boolean;
  isInternalCustomer?: boolean;
  isExternalCustomer?: boolean;
  customerCategory?: CustomerCategory;
  subject?: string;
  roles?: string[];
  // access token is refreshed as necessary and passed to the backend in graphql queries.
  getAccessToken: () => Promise<string | undefined>;
  idTokenParsed?: TokenClaims;
}
export interface TokenClaims {
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
}

/**
 * Fetch the caller's resolved permissions with a plain `fetch`.
 *
 * Deliberately not Apollo: this runs during module evaluation, inside the
 * top-level `await initKeycloak()` below, and the Apollo client is not created
 * until `root.tsx` renders. Deliberately not `getAccessToken()` either — that
 * burns an `updateToken(30)` round trip on a token we just obtained.
 *
 * Folded into the same top-level await on purpose. That await is what lets both
 * route guards be a bare two-state ternary: by the time any component renders, the
 * user is fully known. Fetching permissions later would make every gated route
 * bounce to home on a hard refresh.
 */
async function fetchPermissions(token: string | undefined): Promise<{ effective: string[]; asCustomer: string[] } | null> {
  const endpoint = import.meta.env.VITE_BACKEND;
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query: '{ myPermissions { effective asCustomer } }' }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const permissions = body?.data?.myPermissions;
    if (!permissions) return null;
    return { effective: permissions.effective ?? [], asCustomer: permissions.asCustomer ?? [] };
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return null;
  }
}

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

async function getAccessToken() : Promise<string | undefined> {
  if (!keycloak.authenticated) {
    return undefined;
  }
  try {
    await keycloak.updateToken(30);
  } catch (error) {
    console.error(`Failed to refresh token: ${error.name}: ${error.message}`);
  }
  return keycloak.token;
}


/** When true, skip Keycloak and act as a logged-in staff user (for local dev with backend DISABLE_AUTH=true). */
const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

async function initKeycloak(): Promise<UserProps | null> {
  // Do not attempt to initialize during SSR
  if (typeof window === 'undefined') {
    return null;
  }
  if (isAuthDisabled) {
    // Ask the backend what these roles may do rather than hardcoding a second copy
    // of the table: its own DISABLE_AUTH branch synthesises a user from DEV_AS_ROLES
    // and answers accordingly. Keep VITE_DEV_AS_ROLES in step with DEV_AS_ROLES;
    // it is only responsible for the staff flag and the role chips here.
    const devRoles = (import.meta.env.VITE_DEV_AS_ROLES ?? 'damplab-staff')
      .split(',')
      .map((r: string) => r.trim())
      .filter(Boolean);
    const permissions = await fetchPermissions(undefined);
    return {
      isAuthenticated: true,
      isDamplabStaff: devRoles.includes('damplab-staff'),
      isInternalCustomer: false,
      isExternalCustomer: false,
      customerCategory: undefined,
      roles: devRoles,
      permissions: permissions?.effective ?? [],
      customerPermissions: permissions?.asCustomer ?? [],
      permissionsLoaded: permissions !== null,
      getAccessToken: async () => undefined,
      idTokenParsed: { email: 'dev@local', name: 'Dev User' },
    } as UserProps;
  }
  try {
    await keycloak.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });
    const roles: string[] = keycloak.realmAccess?.roles ?? [];
    const groups: string[] = Array.isArray((keycloak.tokenParsed as any)?.groups)
      ? ((keycloak.tokenParsed as any).groups as string[])
      : [];
    // Roles and groups are matched the same way, and the precedence lives in one
    // place shared with the invoice/estimate paths -- see utils/customerCategory.
    const allGroupLikeClaims = [...roles, ...groups];
    const isInternalCustomer = isInternalCustomerClaims(allGroupLikeClaims);
    const isExternalCustomer = isExternalCustomerClaims(allGroupLikeClaims);
    const customerCategory = deriveCustomerCategory(allGroupLikeClaims);
    // Same top-level await as the Keycloak init, so permissions are known before
    // any component renders and the route guards stay two-state.
    const permissions = keycloak.authenticated ? await fetchPermissions(keycloak.token) : null;
    return {
      isAuthenticated: keycloak.authenticated,
      isDamplabStaff: keycloak.realmAccess?.roles.includes("damplab-staff"),
      isInternalCustomer,
      isExternalCustomer,
      customerCategory,
      subject: keycloak.subject,
      roles: roles,
      permissions: permissions?.effective ?? [],
      customerPermissions: permissions?.asCustomer ?? [],
      permissionsLoaded: permissions !== null,
      getAccessToken: getAccessToken,
      idTokenParsed: keycloak.idTokenParsed,
    } as UserProps;
  } catch (error) {
    console.error("Failed to initialize keycloak adapter:", error);
    return {
      isAuthenticated: false,
    } as UserProps;
  }
}

export const UserContext = createContext({
  keycloak: keycloak,
  userProps: await initKeycloak(),
} as UserContextProps);