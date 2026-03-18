import type { AuthenticatedRequestContext } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestContext;
    }
  }
}

export {};
