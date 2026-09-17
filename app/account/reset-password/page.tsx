import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/platform/PasswordRecoveryForm";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/platform/password-recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  let valid = params.error !== "invalid" && cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "active";
  if (valid) {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    valid = Boolean(user && !error);
  }
  return <ResetPasswordForm valid={valid} />;
}
