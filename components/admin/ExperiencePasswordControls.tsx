import { updateExperiencePassword } from "@/lib/experiences/access/admin-actions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { passwordManagementAuthorized } from "@/lib/experiences/access/server";

export async function ExperiencePasswordControls({ experienceId }: { experienceId: string }) {
  if (!await passwordManagementAuthorized(experienceId)) return null;
  // Read only the identifier; credentials never enter UI props or rendered markup.
  const result = await createAdminSupabaseClient().from("experience_password_credentials").select("experience_id").eq("experience_id", experienceId).maybeSingle();
  if (result.error) throw new Error("Unable to load password protection settings.");
  const protectedExperience = Boolean(result.data);
  const action = updateExperiencePassword.bind(null, experienceId);
  return <div className="experience-password-settings"><h3>Experience password</h3><p>Password protection is an additional access gate. Catalog visibility and admission rules above still apply.</p>{protectedExperience ? <><p role="status">Password protection is active.</p><details><summary>Change Password</summary><PasswordForm action={action} label="Save New Password"/></details><form action={action}><input type="hidden" name="operation" value="remove"/><button className="admin-secondary" type="submit">Remove Password</button></form></> : <><p>No password is required.</p><details><summary>Enable Password Protection</summary><PasswordForm action={action} label="Save Password"/></details></>}</div>;
}
function PasswordForm({ action, label }: { action: (form: FormData) => Promise<void>; label: string }) {
  return <form action={action} className="admin-form"><input type="hidden" name="operation" value="set"/><label>Access Password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required/></label><label>Confirm Password<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required/></label><p className="admin-field-note">Changing the password revokes previously issued password access grants.</p><button className="admin-primary" type="submit">{label}</button></form>;
}
