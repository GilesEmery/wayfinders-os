import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverSignupNotifications, type SignupEvent } from "./signup-notification";

/** Notification failure must not undo an account which Supabase has already created. */
export async function notifyAdminsOfSignup(event: SignupEvent) {
  try {
    const members = await createAdminSupabaseClient().from("admin_members").select("id,email_normalized,role,status").eq("status", "active").in("role", ["admin", "super_admin"]).order("id");
    if (members.error) throw new Error("Unable to load signup notification recipients.");
    const result = await deliverSignupNotifications(event, members.data ?? [], { apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.PURPOSEOS_EMAIL_FROM ?? "" });
    if (!result.recipients || result.failedRecipientIds.length) console.error("PurposeOS signup notification incomplete", { userId: event.userId, ...result });
  } catch {
    console.error("PurposeOS signup notification failed; check email configuration and provider availability", { userId: event.userId });
  }
}
