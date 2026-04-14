"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";
import { isLocalModeClient } from "@/lib/localdb/mode";

export default function LoginPage() {
  const router = useRouter();
  const isLocal = isLocalModeClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (isLocal) {
      const res = await withMinDelay(fetch("/api/local-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }));
      const result = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(result.error ?? "Sign in failed");
        return;
      }
    } else {
      const supabase = createClient();
      const { error: signInError } = await withMinDelay(supabase.auth.signInWithPassword({ email, password }));
      setLoading(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <LoadingOverlay visible={loading} label="Signing you in" />
      <h1 className="campus-heading text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in to your dorm room space.</p>

      <form onSubmit={onSubmit} className="campus-card mt-8 space-y-4 rounded-xl p-6">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="campus-btn-primary w-full rounded-md px-4 py-2 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        New here? <Link className="text-slate-900 underline" href="/auth/register">Create account</Link>
      </p>
    </main>
  );
}
