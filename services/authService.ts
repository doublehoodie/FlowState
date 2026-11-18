import { isDemoMode } from "@/lib/demoMode";
import { resetDemoData } from "@/lib/demoStore";
import { DEMO_USER } from "@/lib/demoUser";
import { supabase } from "@/lib/supabase";

function throwAuthError(error: unknown): never {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "over_email_send_rate_limit"
  ) {
    throw new Error(
      "Email rate limit exceeded: Supabase’s built-in email only allows a small number of messages per hour per project. Wait and try again, disable “Confirm email” under Authentication → Providers → Email for development, or add custom SMTP under Authentication."
    );
  }
  throw error instanceof Error ? error : new Error(String(error));
}

export async function getCurrentUser() {
  if (isDemoMode) return DEMO_USER;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  if (isDemoMode) return DEMO_USER;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(email: string, password: string) {
  if (isDemoMode) return DEMO_USER;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throwAuthError(error);
  return data.user;
}

export async function signOut() {
  if (isDemoMode) {
    resetDemoData();
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
