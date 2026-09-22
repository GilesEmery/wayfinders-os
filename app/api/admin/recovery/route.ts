import { disabledAdminRecoveryResponse } from "@/lib/admin/deprecated-endpoints";

// Deliberately fail closed in every environment. Administrators use the
// standard Supabase password-recovery flow shared by all Purpose OS accounts.
export async function POST() {
  return disabledAdminRecoveryResponse();
}
