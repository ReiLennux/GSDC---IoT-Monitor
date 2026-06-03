import { AlertSeverity, AlertType } from "../enums";

export interface Alert {
    alertId: string;
    deviceId: string;
    severity: AlertSeverity;
    type: AlertType;
    message: string;
    acknowledged: boolean;
    resolvedAt: string | null;
    createdAt: string;
}