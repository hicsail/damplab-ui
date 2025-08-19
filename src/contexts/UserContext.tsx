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


async function initKeycloak(): Promise<UserProps> {
  try {
    await keycloak.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });
    return {
      isAuthenticated: keycloak.authenticated,
      isDamplabStaff: keycloak.realmAccess?.roles.includes("damplab-staff"),
      isInternalCustomer: keycloak.realmAccess?.roles.includes("internal-customer"),
      isExternalCustomer: keycloak.realmAccess?.roles.includes("external-customer"),
      subject: keycloak.subject,
      roles: keycloak.realmAccess,
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