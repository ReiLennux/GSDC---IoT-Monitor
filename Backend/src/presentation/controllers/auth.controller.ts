import { Request, Response, NextFunction } from 'express';
import { AuthUseCases } from '../../application/usecases';

export class AuthController {
  constructor(private uc: AuthUseCases) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.uc.register(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.uc.login(req.body);
      res.json(result);
    } catch (err) { next(err); }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await this.uc.refresh(req.body);
      res.json(tokens);
    } catch (err) { next(err); }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.uc.logout({ userId: req.user!.sub });
      res.json({ message: 'Logged out' });
    } catch (err) { next(err); }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.uc.getMe({ userId: req.user!.sub });
      res.json(user);
    } catch (err) { next(err); }
  };
}
