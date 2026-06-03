import bcrypt from 'bcryptjs';
import { HashService } from '../../application/ports/hash-service';

export class BcryptHashService implements HashService {
  async hash(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
