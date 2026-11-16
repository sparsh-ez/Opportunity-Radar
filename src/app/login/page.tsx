"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace(search.get("next")?.startsWith("/") ? search.get("next")! : "/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage("Password reset link sent. Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7FC] flex items-center justify-center p-5">
      <section className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-[#1E2958] text-white grid place-items-center font-bold text-xl">O</div>
          <div><h1 className="text-xl font-bold text-[#0E1738]">Opportunity Radar</h1><p className="text-xs text-[#64748B]">Your personal opportunity workspace</p></div>
        </div>
        <h2 className="text-2xl font-bold text-[#0E1738]">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back"}</h2>
        <p className="text-sm text-[#64748B] mt-2 mb-6">{mode === "signup" ? "Create a private workspace for your opportunities." : mode === "reset" ? "We'll email you a secure password reset link." : "Sign in to continue to your workspace."}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && <div><label className="block text-sm font-medium mb-1.5 text-[#334155]">Full name</label><input required value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 outline-none focus:ring-2 focus:ring-[#5267B8]" placeholder="Your name"/></div>}
          <div><label className="block text-sm font-medium mb-1.5 text-[#334155]">Email</label><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 outline-none focus:ring-2 focus:ring-[#5267B8]" placeholder="you@example.com"/></div>
          {mode !== "reset" && <div><label className="block text-sm font-medium mb-1.5 text-[#334155]">Password</label><input required type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 outline-none focus:ring-2 focus:ring-[#5267B8]" placeholder="At least 8 characters"/><p className="text-xs text-[#64748B] mt-1">Long passphrases supported. No short maximum length.</p></div>}
          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>}
          <button disabled={busy} className="w-full bg-[#1E2958] hover:bg-[#151D42] disabled:opacity-60 text-white font-semibold rounded-xl py-3">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
          {mode === "login" ? <><button onClick={()=>{setMode("signup");setError("");setMessage("");}} className="text-[#334E9A] font-medium">Create account</button><button onClick={()=>{setMode("reset");setError("");setMessage("");}} className="text-[#64748B]">Forgot password?</button></> : <button onClick={()=>{setMode("login");setError("");setMessage("");}} className="text-[#334E9A] font-medium">Back to sign in</button>}
        </div>
      </section>
    </main>
  );
}
