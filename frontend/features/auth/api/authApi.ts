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

let currentUserCache: CurrentUser | null = null;
let currentUserPromise: Promise<CurrentUser> | null = null;
const CURRENT_USER_STORAGE_KEY = "learning-platform.current-user.v1";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function persistCurrentUser(user: CurrentUser) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
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
    return JSON.parse(rawValue) as CurrentUser;
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
  currentUserCache = user;
  currentUserPromise = Promise.resolve(user);
  persistCurrentUser(user);
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

  if (currentUserCache && currentUserCache.id !== sessionUserId) {
    currentUserCache = null;
    currentUserPromise = null;
  }

  if (currentUserCache?.id === sessionUserId) {
    return currentUserCache;
  }

  const persistedCurrentUser = loadPersistedCurrentUser();

  if (persistedCurrentUser && persistedCurrentUser.id !== sessionUserId) {
    clearPersistedCurrentUser();
  }

  if (persistedCurrentUser?.id === sessionUserId) {
    primeCurrentUserCache(persistedCurrentUser);
    return persistedCurrentUser;
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

  if (currentUserCache?.id === response.user.id) {
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
