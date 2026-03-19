import { createContext } from "react";
import Keycloak from "keycloak-js";

export interface UserContextProps {
  keycloak: any;
  userProps: UserProps;
}
export interface UserProps {
  isAuthenticated: boolean;
  isDamplabStaff?: boolean;
  isInternalCustomer?: boolean;
  isExternalCustomer?: boolean;
  customerCategory?:
    | 'INTERNAL_CUSTOMERS'
    | 'EXTERNAL_CUSTOMER_ACADEMIC'
    | 'EXTERNAL_CUSTOMER_MARKET'
    | 'EXTERNAL_CUSTOMER_NO_SALARY';
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
    return {
      isAuthenticated: true,
      isDamplabStaff: true,
      isInternalCustomer: false,
      isExternalCustomer: false,
      customerCategory: undefined,
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
    const allGroupLikeClaims = [...roles, ...groups];
    const hasGroup = (groupName: string) =>
      allGroupLikeClaims.some((entry) => entry === groupName || entry.endsWith(`/${groupName}`));

    const isInternalCustomer = hasGroup("internal-customers") || hasGroup("internal-customer");
    const isExternalCustomer =
      hasGroup("external-customer-academic") ||
      hasGroup("external-customer-market") ||
      hasGroup("external-customer-no-salary") ||
      hasGroup("external-customer");

    const customerCategory =
      hasGroup("internal-customers")
        ? 'INTERNAL_CUSTOMERS'
        : hasGroup("external-customer-academic")
          ? 'EXTERNAL_CUSTOMER_ACADEMIC'
          : hasGroup("external-customer-market")
            ? 'EXTERNAL_CUSTOMER_MARKET'
            : hasGroup("external-customer-no-salary")
              ? 'EXTERNAL_CUSTOMER_NO_SALARY'
              : hasGroup("internal-customer")
                ? 'INTERNAL_CUSTOMERS'
                : hasGroup("external-customer")
                  ? 'EXTERNAL_CUSTOMER_MARKET'
                  : undefined;
    return {
      isAuthenticated: keycloak.authenticated,
      isDamplabStaff: keycloak.realmAccess?.roles.includes("damplab-staff"),
      isInternalCustomer,
      isExternalCustomer,
      customerCategory,
      subject: keycloak.subject,
      roles: roles,
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