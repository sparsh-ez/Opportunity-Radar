"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(e:FormEvent){
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if(password.length<8) throw new Error("Use a password with at least 8 characters.");
      const {error}=await createClient().auth.updateUser({password});
      if(error) throw error;
      setMessage("Password updated. Redirecting to your workspace…");
      setTimeout(()=>router.replace("/"),900);
    } catch(err:any){setError(err.message||"Could not update password.");}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-[#F5F7FC] grid place-items-center p-5"><form onSubmit={submit} className="w-full max-w-md bg-white border rounded-3xl p-8 space-y-4"><h1 className="text-2xl font-bold text-[#0E1738]">Set a new password</h1><label className="block text-sm font-medium">New password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full border rounded-xl p-3" placeholder="At least 8 characters"/></label><p className="text-xs text-[#64748B]">Long passphrases supported. No short maximum length.</p>{error&&<p className="text-sm text-red-700">{error}</p>}{message&&<p className="text-sm text-green-700">{message}</p>}<button disabled={busy} className="w-full bg-[#1E2958] text-white rounded-xl p-3 font-semibold">{busy?"Saving…":"Update password"}</button></form></main>;
}
