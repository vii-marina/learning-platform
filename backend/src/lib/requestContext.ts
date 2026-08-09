import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request data that every log line should carry.
 *
 * This lives in an AsyncLocalStorage rather than being threaded through function
 * arguments: services are many layers below the request and would otherwise all
 * need a context parameter they do not otherwise use. The store is populated once,
 * by `requestLogger`, and read only by the logger.
 */
export type RequestContext = {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  role?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Attaches the caller's identity to the current request's logs. Called by
 * `requireAuth` once the token has been verified, so every line logged after
 * authentication says who caused it.
 */
export function setRequestUser(userId: string, role?: string): void {
  const store = storage.getStore();

  if (!store) {
    return;
  }

  store.userId = userId;
  store.role = role;
}
