/**
 * Public auth server functions (no session required).
 * Sign-up uses the service-role client so new users are created with
 * email_confirm: true — no confirmation email, immediate sign-in.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUpAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data }) => {
    const serviceKey =
      process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
      process.env["SUPABASE_SECRET_KEY"]?.trim();

    // Publishable / anon keys cannot call admin APIs — fall back to client signUp
    // (requires "Confirm email" disabled in Supabase Dashboard).
    if (!serviceKey || serviceKey.startsWith("sb_publishable_")) {
      return { ok: false as const, needsClientSignup: true as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        throw new Error("An account with this email already exists. Sign in instead.");
      }
      throw new Error(error.message);
    }

    return { ok: true as const, needsClientSignup: false as const };
  });
