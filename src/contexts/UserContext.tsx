import { createContext } from "react";
import Keycloak from "keycloak-js";

export interface UserContextProps {
  keycloak: any;
  // The application must wait for keycloak.init() to resolve before consuming any of the keycloak object properties.
  // Extracting/interpreting the user properties in this module and guarding _all_ the user properties behind the
  // keycloak.init() Promise helps consumers of this context to not use the keycloak object incorrectly.
  userProps: Promise<UserProps>;
}
export interface UserProps {
  isAuthenticated: boolean;
  isDamplabStaff?: boolean;
  isInternalCustomer?: boolean;
  isExternalCustomer?: boolean;
  subject?: string;
  roles?: string[];
  idTokenParsed?: object;
}

const keycloak = new Keycloak({
  url: process.env.REACT_APP_KEYCLOAK_URL,
  realm: process.env.REACT_APP_KEYCLOAK_REALM,
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID,
});

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
  userProps: initKeycloak(),
} as UserContextProps);
