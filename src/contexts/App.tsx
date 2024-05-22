import { createContext } from "react";


type AppContext = {
    services: any[];
    bundles : any[];
    hazards : Array<string>;
}

export const AppContext  = createContext({} as AppContext);
