export interface TokenService {
  sign(payload: string | Buffer | object, options?: { expiresIn?: string | number }): string;
  verify<T>(token: string): T;
}
