"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { withMinDelay } from "@/lib/ui/withMinDelay";
import { isLocalModeClient } from "@/lib/localdb/mode";

export default function RegisterPage() {
  const router = useRouter();
  const isLocal = isLocalModeClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (isLocal) {
      const res = await withMinDelay(fetch("/api/local-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, password }),
      }));
      const result = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(result.error ?? "Register failed");
        return;
      }
    } else {
      const supabase = createClient();
      const { error: signUpError } = await withMinDelay(supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      }));

      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <LoadingOverlay visible={loading} label="Creating your account" />
      <h1 className="campus-heading text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">Set up your dorm communication workspace.</p>

      <form onSubmit={onSubmit} className="campus-card mt-8 space-y-4 rounded-xl p-6">
        <label className="block text-sm">
          Display name
          <input
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>

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
            minLength={6}
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
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Already have one? <Link className="text-slate-900 underline" href="/auth/login">Sign in</Link>
      </p>
    </main>
  );
}
