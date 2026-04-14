"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { withMinDelay } from "@/lib/ui/withMinDelay";

type Props = {
  userId: string;
  email: string;
  displayName: string;
};

export function UserProfileMenu({ userId, email, displayName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return "S";
    return trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((v) => v[0]?.toUpperCase() ?? "")
      .join("");
  }, [name]);

  async function saveProfile() {
    const nextName = name.trim();
    if (!nextName) {
      setError("Display name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await withMinDelay(
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nextName }),
      }),
      320,
    );

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Could not update profile");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-xs uppercase tracking-wide text-slate-500">Student profile</p>

          <div className="mt-3 space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">User ID</p>
              <p className="truncate font-mono text-xs text-slate-700">{userId}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="truncate text-slate-800">{email}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Display name</p>
              {editing ? (
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              ) : (
                <p className="text-slate-800">{name}</p>
              )}
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="campus-btn-secondary rounded-md px-3 py-2 text-sm"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={loading}
                  className="campus-btn-primary rounded-md px-3 py-2 text-sm"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setName(displayName);
                    setError(null);
                  }}
                  disabled={loading}
                  className="campus-btn-secondary rounded-md px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
