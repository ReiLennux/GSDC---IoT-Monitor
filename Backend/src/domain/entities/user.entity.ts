import { UserRole } from "../enums";

export interface User {
    PK: string;
    SK: string;
    GSI1PK: string;
    userId: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
}