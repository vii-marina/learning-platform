import { authorizedBackendRequest } from "./backendClient";
import { clearPendingRegistration, getPendingRegistration } from "../lib/pendingRegistration";
import type {
  CurrentUser,
  PublicRegistrationRole,
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

export function clearCurrentUserCache() {
  currentUserCache = null;
  currentUserPromise = null;
}

export function primeCurrentUserCache(user: CurrentUser) {
  currentUserCache = user;
  currentUserPromise = Promise.resolve(user);
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
  if (currentUserCache) {
    return currentUserCache;
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

export async function listAdminUsers(role?: UserRole) {
  const searchParams = new URLSearchParams();

  if (role) {
    searchParams.set("role", role);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await authorizedBackendRequest<UsersResponse>(`/admin/users${suffix}`);
  return response.users;
}

export async function listTeachers() {
  const response = await authorizedBackendRequest<UsersResponse>("/admin/teachers");
  return response.users;
}

export async function listStudents() {
  const response = await authorizedBackendRequest<UsersResponse>("/admin/students");
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
