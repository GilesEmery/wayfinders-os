import { goneAdminSetupResponse } from "@/lib/admin/deprecated-endpoints";

export async function POST() {
  return goneAdminSetupResponse();
}
