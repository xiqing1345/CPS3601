import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
      <div className="campus-paper-card rounded-3xl p-8 md:p-10">
        <p className="campus-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
          Dorm Exchange
        </p>
        <h1 className="campus-heading mt-4 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
          Chat, proposals, and active roommate agreements in one place.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-700">
          A practical dorm communication platform: discuss in chat, vote on proposals, and keep active agreements
          organized outside the message stream.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="campus-btn-primary rounded-md px-4 py-2 text-sm font-medium" href="/auth/register">
            Create account
          </Link>
          <Link className="campus-btn-secondary rounded-md px-4 py-2 text-sm font-medium" href="/auth/login">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
