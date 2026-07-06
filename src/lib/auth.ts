"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, expectedToken, tokenForPassword } from "@/lib/session";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = await expectedToken();

  // No password configured — nothing to log into.
  if (!expected) redirect("/");

  const submitted = await tokenForPassword(password);
  if (submitted !== expected) redirect("/login?error=1");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
