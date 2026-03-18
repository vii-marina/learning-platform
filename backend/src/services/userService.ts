import type { User } from "@supabase/supabase-js";
import { AppError } from "../lib/appError";
import { isAdminRole, normalizeUserRole } from "../lib/roles";
import { supabaseAdmin } from "../lib/supabase";
import type {
  AdminRow,
  AuthenticatedRequestContext,
  NormalizedUser,
  UserProfileRow,
  UserRole,
} from "../types/auth";

const profileSelect = "id,email,full_name,role,created_at";
const adminSelect = "id,is_super_admin,created_at";

type ProfilePayload = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};

function toServiceError(statusCode: number, code: string, fallbackMessage: string, error: { message: string }) {
  return new AppError(statusCode, `${fallbackMessage}: ${error.message}`, code);
}

function buildNormalizedUser(
  userId: string,
  profile: UserProfileRow | null,
  adminRecord: AdminRow | null,
  fallbackEmail?: string | null
): NormalizedUser | null {
  const role = normalizeUserRole(profile?.role ?? null, adminRecord);

  if (!profile && !adminRecord) {
    return null;
  }

  if (!role) {
    return null;
  }

  const email = fallbackEmail ?? profile?.email;

  if (!email) {
    throw new AppError(500, "Managed user is missing an email address.", "USER_EMAIL_MISSING");
  }

  return {
    id: userId,
    email,
    fullName: profile?.full_name ?? null,
    role,
    isAdmin: isAdminRole(role),
    isSuperAdmin: role === "super-admin",
    createdAt: profile?.created_at ?? adminRecord?.created_at ?? null,
  };
}

export async function getProfileById(userId: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "PROFILE_FETCH_FAILED", "Unable to load profile", error);
  }

  return (data as UserProfileRow | null) ?? null;
}

export async function getAdminRecordById(userId: string): Promise<AdminRow | null> {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select(adminSelect)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw toServiceError(500, "ADMIN_FETCH_FAILED", "Unable to load admin record", error);
  }

  return (data as AdminRow | null) ?? null;
}

export async function saveProfile(payload: ProfilePayload): Promise<void> {
  const existingProfile = await getProfileById(payload.id);

  if (existingProfile) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
      })
      .eq("id", payload.id);

    if (error) {
      throw toServiceError(500, "PROFILE_UPDATE_FAILED", "Unable to update profile", error);
    }

    return;
  }

  const { error } = await supabaseAdmin.from("profiles").insert(payload);

  if (error) {
    throw toServiceError(500, "PROFILE_CREATE_FAILED", "Unable to create profile", error);
  }
}

export async function ensureTeacherProfile(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("teacher_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw toServiceError(
      500,
      "TEACHER_PROFILE_FETCH_FAILED",
      "Unable to load teacher profile",
      error
    );
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabaseAdmin.from("teacher_profiles").insert({ id: userId });

  if (insertError) {
    throw toServiceError(
      500,
      "TEACHER_PROFILE_CREATE_FAILED",
      "Unable to create teacher profile",
      insertError
    );
  }
}

export async function saveAdminRecord(userId: string, isSuperAdmin: boolean): Promise<void> {
  const existingAdmin = await getAdminRecordById(userId);

  if (existingAdmin) {
    const { error } = await supabaseAdmin
      .from("admins")
      .update({ is_super_admin: isSuperAdmin })
      .eq("id", userId);

    if (error) {
      throw toServiceError(500, "ADMIN_UPDATE_FAILED", "Unable to update admin record", error);
    }

    return;
  }

  const { error } = await supabaseAdmin
    .from("admins")
    .insert({ id: userId, is_super_admin: isSuperAdmin });

  if (error) {
    throw toServiceError(500, "ADMIN_CREATE_FAILED", "Unable to create admin record", error);
  }
}

export async function removeAdminRecord(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("admins").delete().eq("id", userId);

  if (error) {
    throw toServiceError(500, "ADMIN_DELETE_FAILED", "Unable to remove admin record", error);
  }
}

export async function getAuthUserById(userId: string): Promise<User> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw new AppError(404, "User not found in Supabase Auth.", "AUTH_USER_NOT_FOUND");
  }

  return data.user;
}

export async function getRequestAuthContext(
  userId: string,
  email: string
): Promise<AuthenticatedRequestContext> {
  const [profile, adminRecord] = await Promise.all([getProfileById(userId), getAdminRecordById(userId)]);
  const role = normalizeUserRole(profile?.role ?? null, adminRecord);

  return {
    userId,
    email,
    fullName: profile?.full_name ?? null,
    role,
    isAdmin: isAdminRole(role),
    isSuperAdmin: role === "super-admin",
    profileExists: Boolean(profile),
  };
}

export async function getNormalizedUserById(
  userId: string,
  fallbackEmail?: string | null
): Promise<NormalizedUser | null> {
  const [profile, adminRecord] = await Promise.all([getProfileById(userId), getAdminRecordById(userId)]);
  const authUser = !profile?.email && adminRecord ? await getAuthUserById(userId) : null;

  return buildNormalizedUser(userId, profile, adminRecord, fallbackEmail ?? authUser?.email ?? null);
}

export async function listManagedUsers(): Promise<NormalizedUser[]> {
  const [profilesResult, adminsResult, authUsers] = await Promise.all([
    supabaseAdmin.from("profiles").select(profileSelect).order("created_at", { ascending: false }),
    supabaseAdmin.from("admins").select(adminSelect),
    listAllAuthUsers(),
  ]);

  if (profilesResult.error) {
    throw toServiceError(
      500,
      "PROFILES_LIST_FAILED",
      "Unable to list profiles",
      profilesResult.error
    );
  }

  if (adminsResult.error) {
    throw toServiceError(500, "ADMINS_LIST_FAILED", "Unable to list admins", adminsResult.error);
  }

  const profiles = (profilesResult.data ?? []) as UserProfileRow[];
  const admins = (adminsResult.data ?? []) as AdminRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const adminById = new Map(admins.map((adminRecord) => [adminRecord.id, adminRecord]));
  const managedIds = new Set<string>([
    ...profiles.map((profile) => profile.id),
    ...admins.map((adminRecord) => adminRecord.id),
  ]);
  const users: NormalizedUser[] = [];

  for (const userId of managedIds) {
    const normalizedUser = buildNormalizedUser(
      userId,
      profileById.get(userId) ?? null,
      adminById.get(userId) ?? null,
      authUsers.get(userId)?.email ?? null
    );

    if (normalizedUser) {
      users.push(normalizedUser);
    }
  }

  return users.sort((left, right) => {
    const leftDate = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightDate = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightDate - leftDate;
  });
}

async function listAllAuthUsers(): Promise<Map<string, { email: string | null }>> {
  const authUsers = new Map<string, { email: string | null }>();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new AppError(500, `Unable to list auth users: ${error.message}`, "AUTH_USERS_LIST_FAILED");
    }

    for (const authUser of data.users) {
      authUsers.set(authUser.id, { email: authUser.email ?? null });
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return authUsers;
}
