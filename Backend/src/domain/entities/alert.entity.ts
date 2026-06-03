import { AlertSeverity, AlertType } from "../enums";

export interface Alert {
    PK: string;
    SK: string;
    GSI1PK: string;
    alertId: string;
    deviceId: string;
    severity: AlertSeverity;
    type: AlertType;
    message: string;
    acknowledged: boolean;
    resolvedAt: string | null;
    createdAt: string;
}