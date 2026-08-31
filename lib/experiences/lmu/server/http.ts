import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { LMU_MAX_PAYLOAD_BYTES } from "./constants";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonObject(request: NextRequest) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > LMU_MAX_PAYLOAD_BYTES) throw new PayloadError("Payload is too large.", 413);
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new PayloadError("Request body must be valid JSON.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PayloadError("Request body must be an object.", 400);
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > LMU_MAX_PAYLOAD_BYTES) {
    throw new PayloadError("Payload is too large.", 413);
  }
  return value as Record<string, unknown>;
}

export class PayloadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
