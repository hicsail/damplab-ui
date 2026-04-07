import { createContext } from "react";


type AppContext = {
    services: any[];
    bundles : any[];
    hazards : Array<string>;
    refreshCatalog: () => Promise<void>;
}

export const AppContext  = createContext({} as AppContext);
