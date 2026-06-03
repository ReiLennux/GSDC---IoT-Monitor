import { UserRole } from "../enums";

export interface User {
    userId: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
}