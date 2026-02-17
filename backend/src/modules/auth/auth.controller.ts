import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type { CustomerRegisterInput, AdminRegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schema';

export async function customerRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerCustomer(req.body as CustomerRegisterInput);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function customerLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginCustomer(req.body as LoginInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerAdmin(req.body as AdminRegisterInput);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginAdmin(req.body as LoginInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = req.body as RefreshInput;
    const result = await authService.refreshAccessToken(refresh_token);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = req.body as LogoutInput;
    await authService.logout(refresh_token);
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}
