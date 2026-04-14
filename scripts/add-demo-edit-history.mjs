import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "local-demo.db");

function ensureHistoryTable(db) {
  db.exec(`
    create table if not exists proposal_edit_history (
      id text primary key,
      proposal_id text not null,
      editor_id text not null,
      previous_category text not null,
      previous_title text not null,
      previous_description text not null,
      previous_full_details text not null,
      edited_at text not null
    );
    create index if not exists idx_proposal_edit_history_proposal_time on proposal_edit_history(proposal_id, edited_at desc);
  `);
}

function seedHistory(db) {
  const users = db.prepare("select id, email from users").all();
  if (users.length === 0) {
    throw new Error("No users found. Run npm run seed:local first.");
  }

  const jordan = users.find((u) => u.email === "jordan@example.com") ?? users[0];
  const alex = users.find((u) => u.email === "alex@example.com") ?? users[1] ?? users[0];

  const proposals = db.prepare("select id, title, room_id, proposer_id, category from proposals order by created_at asc").all();
  if (proposals.length === 0) {
    throw new Error("No proposals found. Run npm run seed:local first.");
  }

  const choreProposal = proposals.find((p) => p.title.includes("Chore")) ?? proposals[0];
  const quietProposal = proposals.find((p) => p.title.includes("Quiet")) ?? proposals[proposals.length - 1];

  const now = new Date();
  const ts = (minsAgo) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();

  // Keep demo deterministic on repeated runs.
  db.prepare("delete from proposal_edit_history where proposal_id in (?, ?)").run(choreProposal.id, quietProposal.id);

  const insertHistory = db.prepare(
    "insert into proposal_edit_history (id, proposal_id, editor_id, previous_category, previous_title, previous_description, previous_full_details, edited_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const insertMessage = db.prepare(
    "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  );

  const choreTimeline = [
    {
      title: "Weekly Cleanup Suggestion",
      desc: "Initial rough draft for shared chores.",
      details: "Draft v1: cleanup every Saturday night.",
      minsAgo: 180,
    },
    {
      title: "Weekly Chore Plan",
      desc: "Clarified rotation by roommate.",
      details: "Draft v2: rotate trash/floor/bathroom every week.",
      minsAgo: 120,
    },
    {
      title: "Weekly Chore Rotation",
      desc: "Refined with fixed schedule and ownership.",
      details: "Draft v3: Sunday 20:00 handoff with checklist.",
      minsAgo: 75,
    },
  ];

  for (const item of choreTimeline) {
    const editedAt = ts(item.minsAgo);
    insertHistory.run(
      randomUUID(),
      choreProposal.id,
      jordan.id,
      choreProposal.category,
      item.title,
      item.desc,
      item.details,
      editedAt,
    );
    insertMessage.run(
      randomUUID(),
      choreProposal.room_id,
      null,
      `System: proposal updated - ${choreProposal.title}`,
      "system",
      choreProposal.id,
      editedAt,
    );
  }

  const quietTimeline = [
    {
      title: "Quiet Hours Weekday Draft",
      desc: "Proposed a simple quiet window.",
      details: "Draft v1: 23:30-07:00 weekdays.",
      minsAgo: 55,
    },
    {
      title: "Quiet Hours 11PM-7AM",
      desc: "Adjusted start time after roommate feedback.",
      details: "Draft v2: 23:00-07:00 with low speaker volume.",
      minsAgo: 30,
    },
  ];

  for (const item of quietTimeline) {
    const editedAt = ts(item.minsAgo);
    insertHistory.run(
      randomUUID(),
      quietProposal.id,
      alex.id,
      quietProposal.category,
      item.title,
      item.desc,
      item.details,
      editedAt,
    );
    insertMessage.run(
      randomUUID(),
      quietProposal.room_id,
      null,
      `System: proposal updated - ${quietProposal.title}`,
      "system",
      quietProposal.id,
      editedAt,
    );
  }

  return {
    choreProposalId: choreProposal.id,
    quietProposalId: quietProposal.id,
    total: choreTimeline.length + quietTimeline.length,
  };
}

function main() {
  const db = new Database(DB_PATH);
  ensureHistoryTable(db);

  const result = seedHistory(db);

  console.log("Demo edit history inserted successfully.");
  console.log(`DB: ${DB_PATH}`);
  console.log(`Records inserted: ${result.total}`);
  console.log(`Chore proposal: ${result.choreProposalId}`);
  console.log(`Quiet proposal: ${result.quietProposalId}`);

  db.close();
}

main();
