import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function authorizeAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'Not authenticated'));
  }
  if (req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

export function authorizeCustomer(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'Not authenticated'));
  }
  if (req.user.role !== 'CUSTOMER') {
    return next(new AppError(403, 'Customer access required'));
  }
  next();
}
