// import { User } from "@auth0/auth0-react";
import { Sequence } from "./sequence";

type AdminStatus = "approved" | "rejected" | "falsePositive";

export interface Genome {
    id: string;
    timestamp: Date;
    sequence: Sequence;
    sequenceId: string;
    adminStatus: AdminStatus;
    user: any
}
