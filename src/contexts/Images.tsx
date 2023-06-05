import { createContext, useMemo } from "react";

type ImagesContext = { 
    iconName: string;
    iconURL: string;
};

export const ImagesContext = createContext({} as ImagesContext);
