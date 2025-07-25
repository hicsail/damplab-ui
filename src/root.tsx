import { useEffect, useState } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
// someday: import from @apollo/client once Apollo Client 4 is out (which will address ESM issues) - see discussion at
// https://github.com/apollographql/apollo-client/issues/9976#issuecomment-1768446694
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client/index.js";

import { CanvasContext } from "./contexts/Canvas";
import { AppContext } from "./contexts/App";
import { GET_BUNDLES, GET_SERVICES } from "./gql/queries";
import HeaderBar from "./components/HeaderBar";
import './root.css';

const client = new ApolloClient({
  uri: import.meta.env.VITE_BACKEND,
  cache: new InMemoryCache(),
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico?v=5" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        {/*
                manifest.json provides metadata used when your web app is installed on a
                user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/
        */}
        <link rel="manifest" href="/manifest.json" />
        <title>DAMPLab Canvas</title>
        <Meta />
        <Links />
      </head>

      <body>
        <div className="App">
          <HeaderBar />
          <div style={{ padding: 20 }}>
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

  // initial load of services and bundles
  useEffect(() => {
    client
      .query({ query: GET_SERVICES })
      .then((result) => {
        console.log("services loaded successfully on app", result);
        setServices(result.data.services);
      })
      .catch((error) => {
        console.log("error when loading services on app", error);
      });

    client
      .query({ query: GET_BUNDLES })
      .then((result) => {
        console.log("bundles loaded successfully on app", result);
        setBundles(result.data.bundles);
      })
      .catch((error) => {
        console.log("error when loading bundles on app", error);
      });

    // TODO: Change hazards to a service attribute...
    // Matches to 'activeNode?.data.label in RightSideBar
    setHazards(["Gibson Assembly", "Modular Cloning"]);
  }, []);

  return (
    <ApolloProvider client={client}>
      <AppContext
        value={{ services: services, bundles: bundles, hazards: hazards }}
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
          <Outlet />
        </CanvasContext>
      </AppContext>
    </ApolloProvider>
  );
}
