import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  customerRegisterSchema,
  adminRegisterSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schema';
import {
  customerRegister,
  customerLogin,
  adminRegister,
  adminLogin,
  refresh,
  logoutHandler,
} from './auth.controller';

const router = Router();

// Customer auth
router.post('/customer/register', validate(customerRegisterSchema), customerRegister);
router.post('/customer/login', validate(loginSchema), customerLogin);

// Admin auth
router.post('/admin/register', validate(adminRegisterSchema), adminRegister);
router.post('/admin/login', validate(loginSchema), adminLogin);

// Shared
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', validate(logoutSchema), logoutHandler);

export default router;
