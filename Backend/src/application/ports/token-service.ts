export interface TokenService {
  sign(payload: any, options?: { expiresIn: string | number }): string;
  verify<T>(token: string): T;
}
