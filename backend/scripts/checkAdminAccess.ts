import "dotenv/config";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  };
};

type CheckResult = {
  label: string;
  status: number;
  ok: boolean;
  body: string;
};

const accessToken = process.env.ACCESS_TOKEN;
const baseUrl =
  process.env.BACKEND_URL ??
  process.env.VITE_BACKEND_URL ??
  `http://localhost:${process.env.PORT ?? "4000"}`;

if (!accessToken) {
  console.error("Missing ACCESS_TOKEN.");
  console.error(
    "Run like this: ACCESS_TOKEN='<supabase access token>' npm run check:admin-access"
  );
  process.exit(1);
}

async function request(
  label: string,
  path: string,
  init?: RequestInit
): Promise<CheckResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.text();

  return {
    label,
    status: response.status,
    ok: response.ok,
    body,
  };
}

function printResult(result: CheckResult) {
  console.log(`${result.label}: ${result.status}${result.ok ? " OK" : ""}`);

  if (result.body) {
    console.log(result.body);
  }

  console.log("");
}

function printInterpretation(me: MeResponse, patchCheck: CheckResult) {
  console.log("Interpretation:");

  if (!me.user.isAdmin) {
    console.log("- This account is not admin-level on the backend.");
    return;
  }

  console.log("- Read access to /admin/users, /admin/teachers, /admin/students should be 200.");

  if (me.user.isSuperAdmin) {
    console.log("- This account is super-admin.");
    console.log(
      patchCheck.status === 400
        ? "- PATCH permission is confirmed: middleware allowed the request, then validation rejected the fake UUID."
        : "- PATCH permission is not behaving as expected. For super-admin, the fake PATCH should return 400."
    );
    return;
  }

  console.log("- This account is regular admin.");
  console.log(
    patchCheck.status === 403
      ? "- PATCH is correctly blocked for admin and reserved for super-admin."
      : "- PATCH permission is not behaving as expected. For admin, the fake PATCH should return 403."
  );
}

async function main() {
  console.log(`Checking backend access against ${baseUrl}`);
  console.log("");

  const meResult = await request("GET /auth/me", "/auth/me");
  printResult(meResult);

  if (!meResult.ok) {
    process.exit(1);
  }

  const me = JSON.parse(meResult.body) as MeResponse;

  const usersResult = await request("GET /admin/users", "/admin/users");
  const teachersResult = await request("GET /admin/teachers", "/admin/teachers");
  const studentsResult = await request("GET /admin/students", "/admin/students");
  const patchResult = await request("PATCH /admin/users/not-a-uuid", "/admin/users/not-a-uuid", {
    method: "PATCH",
    body: JSON.stringify({ role: "student" }),
  });

  printResult(usersResult);
  printResult(teachersResult);
  printResult(studentsResult);
  printResult(patchResult);
  printInterpretation(me, patchResult);
}

void main().catch((error) => {
  console.error("Failed to check admin access.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
