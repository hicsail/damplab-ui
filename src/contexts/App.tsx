import { createContext } from "react";

type AppContext = {
    services: any[];
    //setServices: any;
    bundles: any[];
    //setBundles: any;
}

export const AppContext = createContext({} as AppContext);