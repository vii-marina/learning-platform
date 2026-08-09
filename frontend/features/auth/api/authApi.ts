import { authorizedBackendRequest, BackendApiError } from "./backendClient";
import { clearPendingRegistration, getPendingRegistration } from "../lib/pendingRegistration";
import { supabase } from "../../../lib/supabase";
import type {
  CurrentUser,
  PublicRegistrationRole,
  UpdateCurrentUserProfileInput,
  UpdateAdminUserInput,
  UserRole,
} from "../types";

type SingleUserResponse = {
  user: CurrentUser;
};

type UsersResponse = {
  users: CurrentUser[];
};

// The cached profile carries the role every dashboard guard routes on, so it
// cannot be trusted forever: without an expiry a role change server-side would
// never reach a browser that keeps navigating. Past the TTL we refetch /auth/me.
type CachedCurrentUser = {
  user: CurrentUser;
  cachedAt: number;
};

let currentUserCache: CachedCurrentUser | null = null;
let currentUserPromise: Promise<CurrentUser> | null = null;
// Bumped to v2 with the cache entry shape; v1 entries are plain profiles.
const CURRENT_USER_STORAGE_KEY = "learning-platform.current-user.v2";
const CURRENT_USER_TTL_MS = 5 * 60 * 1000;

function isFreshCacheEntry(entry: CachedCurrentUser) {
  return Date.now() - entry.cachedAt < CURRENT_USER_TTL_MS;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persistCurrentUser(entry: CachedCurrentUser) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(entry));
}

function clearPersistedCurrentUser() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

function loadPersistedCurrentUser() {
  if (!canUseLocalStorage()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const entry = JSON.parse(rawValue) as CachedCurrentUser;

    if (!entry?.user?.id || typeof entry.cachedAt !== "number") {
      clearPersistedCurrentUser();
      return null;
    }

    if (!isFreshCacheEntry(entry)) {
      clearPersistedCurrentUser();
      return null;
    }

    return entry;
  } catch {
    clearPersistedCurrentUser();
    return null;
  }
}

export function clearCurrentUserCache() {
  currentUserCache = null;
  currentUserPromise = null;
  clearPersistedCurrentUser();
}

export function primeCurrentUserCache(user: CurrentUser) {
  const entry: CachedCurrentUser = { user, cachedAt: Date.now() };

  currentUserCache = entry;
  currentUserPromise = Promise.resolve(user);
  persistCurrentUser(entry);
}

// Hydrating from storage keeps the original timestamp: re-stamping it here would
// let a profile that is read on every navigation outlive the TTL indefinitely.
function adoptCachedCurrentUser(entry: CachedCurrentUser) {
  currentUserCache = entry;
  currentUserPromise = Promise.resolve(entry.user);
}

export async function registerProfile(input: {
  fullName: string;
  role: PublicRegistrationRole;
}) {
  const response = await authorizedBackendRequest<SingleUserResponse>("/auth/register-profile", {
    method: "POST",
    body: input,
  });

  primeCurrentUserCache(response.user);
  return response.user;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    clearCurrentUserCache();
    throw new BackendApiError(error.message, 401, "SESSION_READ_FAILED");
  }

  const sessionUserId = data.session?.user?.id ?? null;

  if (!sessionUserId) {
    clearCurrentUserCache();
    throw new BackendApiError("No active user session.", 401, "SESSION_MISSING");
  }

  if (currentUserCache && (currentUserCache.user.id !== sessionUserId || !isFreshCacheEntry(currentUserCache))) {
    currentUserCache = null;
    currentUserPromise = null;
  }

  if (currentUserCache?.user.id === sessionUserId) {
    return currentUserCache.user;
  }

  const persistedCurrentUser = loadPersistedCurrentUser();

  if (persistedCurrentUser && persistedCurrentUser.user.id !== sessionUserId) {
    clearPersistedCurrentUser();
  }

  if (persistedCurrentUser?.user.id === sessionUserId) {
    adoptCachedCurrentUser(persistedCurrentUser);
    return persistedCurrentUser.user;
  }

  if (currentUserPromise) {
    return currentUserPromise;
  }

  currentUserPromise = authorizedBackendRequest<SingleUserResponse>("/auth/me")
    .then((response) => {
      primeCurrentUserCache(response.user);
      return response.user;
    })
    .catch((error) => {
      clearCurrentUserCache();
      throw error;
    });

  return currentUserPromise;
}

export async function updateCurrentUserProfile(input: UpdateCurrentUserProfileInput) {
  const response = await authorizedBackendRequest<SingleUserResponse>("/auth/me", {
    method: "PATCH",
    body: input,
  });

  primeCurrentUserCache(response.user);
  return response.user;
}

export async function listAdminUsers(role?: UserRole) {
  const searchParams = new URLSearchParams();

  if (role) {
    searchParams.set("role", role);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await authorizedBackendRequest<UsersResponse>(`/admin/users${suffix}`);
  return response.users;
}

export async function updateAdminUser(userId: string, input: UpdateAdminUserInput) {
  const response = await authorizedBackendRequest<SingleUserResponse>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: input,
  });

  if (currentUserCache?.user.id === response.user.id) {
    primeCurrentUserCache(response.user);
  }

  return response.user;
}

export async function syncPendingRegistrationForEmail(email: string) {
  const pendingRegistration = getPendingRegistration();

  if (!pendingRegistration) {
    return null;
  }

  if (pendingRegistration.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  const user = await registerProfile({
    fullName: pendingRegistration.fullName,
    role: pendingRegistration.role,
  });

  clearPendingRegistration();
  primeCurrentUserCache(user);
  return user;
}
