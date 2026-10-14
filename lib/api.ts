import { NextResponse } from "next/server";
import { requireUser, type SessionUser } from "./auth";
import { isReadOnly } from "./licence";
import type { Role } from "@/types/domain";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Authorized =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

export async function authorize(
  roles: readonly Role[],
  action = "perform this action",
  options: { readOnly?: boolean } = {}
): Promise<Authorized> {
  let user: SessionUser;

  try {
    user = await requireUser([...roles]);
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return { error: fail(`You do not have permission to ${action}.`, 403) };
    }
    return { error: fail("Your session has expired. Please sign in again.", 401) };
  }

  if (!options.readOnly && (await isReadOnly(user.organizationId))) {
    return {
      error: fail(
        "This SACCO's licence has expired, so records are read-only. Contact your software provider to renew.",
        403
      ),
    };
  }

  return { user };
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
