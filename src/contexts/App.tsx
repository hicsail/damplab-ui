import { createContext } from "react";

type AppContext = {
    services: any[];
    //setServices: any;
    bundles: any[];
    //setBundles: any;
    hazards: Array<string>;
    //setHazards: any;
}

export const AppContext = createContext({} as AppContext);