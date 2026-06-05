import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';

export function validateDto(dtoClass: new (...args: unknown[]) => object) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const dto = plainToInstance(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dto);

    if (errors.length > 0) {
      const messages = errors
        .map((e) => Object.values(e.constraints || {}))
        .flat();
      const err = new Error(messages.join(', ')) as Error & { status: number };
      err.status = 400;
      return next(err);
    }

    req.body = dto;
    next();
  };
}
