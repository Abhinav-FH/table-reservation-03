import { TokenOwnerType } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: bigint;
        role: TokenOwnerType;
      };
    }
  }
}
