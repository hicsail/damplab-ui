import { createContext, useState } from "react";

type AppContext = {
    services: any[];
    //setServices: any;
    bundles: any[];
    //setBundles: any;
    hazards: Array<string>;
    //setHazards: any;
    // loggedIn: boolean;
    // setLoggedIn: any;
}

export const AppContext  = createContext({} as AppContext);
