import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="campus-heading text-3xl font-semibold">Help Center</h1>
        <Link className="campus-btn-secondary rounded-md px-3 py-2 text-sm" href="/app">
          Back to app
        </Link>
      </div>

      <section className="campus-paper-card space-y-6 rounded-xl p-6 text-sm leading-6 text-slate-800">
        <article>
          <h2 className="campus-heading text-xl font-semibold">1. Get Started</h2>
          <p className="mt-2">Sign in, then create a room or join a room with an invite code from your roommate.</p>
        </article>

        <article>
          <h2 className="campus-heading text-xl font-semibold">2. Chat and Share</h2>
          <p className="mt-2">Use the chat box to send text messages. You can also click the image icon to upload and send pictures.</p>
        </article>

        <article>
          <h2 className="campus-heading text-xl font-semibold">3. Create Proposals</h2>
          <p className="mt-2">Create proposals for rules like quiet hours, guests, chores, or custom dorm agreements.</p>
        </article>

        <article>
          <h2 className="campus-heading text-xl font-semibold">4. Vote and Activate</h2>
          <p className="mt-2">All roommates can vote. Once everyone approves, the proposal becomes an active agreement.</p>
        </article>

        <article>
          <h2 className="campus-heading text-xl font-semibold">5. Edit and Track History</h2>
          <p className="mt-2">Proposal authors can edit pending/rejected proposals. The system keeps an edit history for transparency.</p>
        </article>

        <article>
          <h2 className="campus-heading text-xl font-semibold">6. Profile Menu</h2>
          <p className="mt-2">Click the avatar button in the top-right corner to view your personal info and edit your display name.</p>
        </article>
      </section>
    </main>
  );
}
