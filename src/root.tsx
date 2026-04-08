import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router";
// someday: import from @apollo/client once Apollo Client 4 is out (which will address ESM issues) - see discussion at
// https://github.com/apollographql/apollo-client/issues/9976#issuecomment-1768446694
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
  ApolloLink,
} from "@apollo/client/index.js";
import { setContext } from "@apollo/client/link/context";

function sanitizeVariables(vars: Record<string, unknown>): Record<string, unknown> {
  if (!vars || typeof vars !== 'object') return vars;
  const out = { ...vars };
  if (typeof out.signatureDataUrl === 'string') {
    out.signatureDataUrl = `[REDACTED base64, ${out.signatureDataUrl.length} chars]`;
  }
  if (out.input && typeof out.input === 'object' && out.input !== null) {
    const input = { ...(out.input as Record<string, unknown>) };
    if (typeof input.signatureDataUrl === 'string') {
      input.signatureDataUrl = `[REDACTED base64, ${input.signatureDataUrl.length} chars]`;
    }
    out.input = input;
  }
  return out;
}

const logLink = new ApolloLink((operation, forward) => {
  const opName = operation.operationName;
  const vars = sanitizeVariables(operation.variables as Record<string, unknown> || {});
  console.log('[GraphQL] request', { operationName: opName, variables: vars });
  return forward(operation).map((response) => {
    const errs = response.errors;
    if (errs && errs.length > 0) {
      console.warn('[GraphQL] response has errors', { operationName: opName, errorCount: errs.length });
      errs.forEach((e, i) => {
        console.error(`[GraphQL] error[${i}]`, {
          message: e.message,
          path: e.path,
          extensions: e.extensions,
        });
      });
    } else {
      console.log('[GraphQL] response ok', { operationName: opName });
    }
    return response;
  });
});

import { CanvasContext } from "./contexts/Canvas";
import { AppContext } from "./contexts/App";
import { GET_BUNDLES, GET_SERVICES } from "./gql/queries";
import { UserContext } from "./contexts/UserContext";
import HeaderBar from "./components/HeaderBar";
import './root.css';
import { CircularProgress } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import theme from './styles/themes';

const CANVAS_AUTOSAVE_KEY = "canvas:autosave";

export function HydrateFallback() {
    return <CircularProgress />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLabMonitor = location.pathname.startsWith('/lab-monitor');
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico?v=5" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <title>DAMPLab Canvas</title>
        <Meta />
        <Links />
      </head>

      <body>
        <div className="App">
          <div style={{ padding: isLabMonitor ? 0 : 20 }}>
            {children}
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState("");
  const [nodeParams, setNodeParams] = useState([]);
  const [services, setServices] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [hazards, setHazards] = useState(Array<string>);

  const userContext = useContext(UserContext);

  // Restore autosaved canvas once on app load.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANVAS_AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const savedNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
      const savedEdges = Array.isArray(parsed?.edges) ? parsed.edges : [];
      if (savedNodes.length > 0 || savedEdges.length > 0) {
        setNodes(savedNodes as any);
        setEdges(savedEdges as any);
      }
    } catch (error) {
      console.warn("Failed to restore autosaved canvas", error);
    }
  }, []);

  // Create Apollo Client with auth link that uses token from context
  const httpLink = useMemo(() => {
    return createHttpLink({
      uri: import.meta.env.VITE_BACKEND,
      credentials: 'include',
    });
  }, []);

  const authLink = useMemo(() => {
    return setContext(async (_, { headers }) => {
      const token = await userContext.userProps?.getAccessToken();
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    });
  }, [userContext.userProps]);

  const client = useMemo(() => {
    return new ApolloClient({
      link: logLink.concat(authLink.concat(httpLink)),
      cache: new InMemoryCache(),
    });
  }, [authLink, httpLink]);

  const refreshCatalog = useCallback(async () => {
    await Promise.all([
      client
      .query({ query: GET_SERVICES })
      .then((result) => {
        console.log("services loaded successfully on app", result);
        setServices(result.data.services);
      })
      .catch((error) => {
        console.log("error when loading services on app", error);
      }),

      client
      .query({ query: GET_BUNDLES })
      .then((result) => {
        console.log("bundles loaded successfully on app", result);
        setBundles(result.data.bundles);
      })
      .catch((error) => {
        console.log("error when loading bundles on app", error);
      })
    ]);
  }, [client]);

  // initial load of services and bundles
  useEffect(() => {
    refreshCatalog();

    // TODO: Change hazards to a service attribute...
    // Matches to 'activeNode?.data.label in RightSideBar
    setHazards(["Gibson Assembly", "Modular Cloning"]);
  }, [refreshCatalog]);

  // Persist canvas changes with a small debounce to avoid frequent writes during drag.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          CANVAS_AUTOSAVE_KEY,
          JSON.stringify({
            nodes,
            edges,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.warn("Failed to autosave canvas", error);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [nodes, edges]);

  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <AppContext
          value={{ services: services, bundles: bundles, hazards: hazards, refreshCatalog }}
        >
          <CanvasContext
            value={{
              nodes: nodes,
              setNodes: setNodes,
              edges: edges,
              setEdges: setEdges,
              activeComponentId: activeComponentId,
              setActiveComponentId: setActiveComponentId,
              nodeParams: nodeParams,
              setNodeParams: setNodeParams,
            }}
          >
            <HeaderBar />
            <Outlet />
          </CanvasContext>
        </AppContext>
      </ThemeProvider>
    </ApolloProvider>
  );
}
