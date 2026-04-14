import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const DB_DIR = process.env.VERCEL === "1"
  ? path.join("/tmp", "dorm-exchange-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "local-demo.db");

let db: Database.Database | null = null;

function ensureDemoSeed(database: Database.Database) {
  const now = new Date();
  const ts = (mins: number) => new Date(now.getTime() + mins * 60 * 1000).toISOString();
  const demoUsers = [
    { id: "11111111-1111-4111-8111-111111111111", email: "jordan@example.com", displayName: "Jordan" },
    { id: "22222222-2222-4222-8222-222222222222", email: "alex@example.com", displayName: "Alex" },
    { id: "33333333-3333-4333-8333-333333333333", email: "sam@example.com", displayName: "Sam" },
  ];

  const users = demoUsers.map((demo) => {
    const existed = database
      .prepare("select id from users where email = ?")
      .get(demo.email) as { id: string } | undefined;

    if (existed) {
      return { ...demo, id: existed.id };
    }

    database
      .prepare("insert into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)")
      .run(demo.id, demo.email, demo.displayName, bcrypt.hashSync("demo123456", 10), ts(-120));

    return demo;
  });

  const demoRoom = database
    .prepare("select id from rooms where invite_code = ?")
    .get("DORM42") as { id: string } | undefined;
  const roomId = demoRoom?.id ?? randomUUID();
  if (!demoRoom) {
    database
      .prepare(
        "insert into rooms (id, room_name, dorm_name, invite_code, created_by, created_at) values (?, ?, ?, ?, ?, ?)",
      )
      .run(roomId, "Room 402", "Maple Hall", "DORM42", users[0].id, ts(-90));
  }

  const insertMember = database.prepare(
    "insert into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
  );
  insertMember.run(randomUUID(), roomId, users[0].id, "admin", ts(-89));
  insertMember.run(randomUUID(), roomId, users[1].id, "member", ts(-88));
  insertMember.run(randomUUID(), roomId, users[2].id, "member", ts(-87));

  const activeProposal = database
    .prepare("select id from proposals where room_id = ? and title = ?")
    .get(roomId, "Weekly Chore Rotation") as { id: string } | undefined;
  const pendingProposal = database
    .prepare("select id from proposals where room_id = ? and title = ?")
    .get(roomId, "Quiet Hours 11PM-7AM") as { id: string } | undefined;

  const proposalActiveId = activeProposal?.id ?? randomUUID();
  const proposalPendingId = pendingProposal?.id ?? randomUUID();

  if (!activeProposal) {
    database.prepare(
      "insert into proposals (id, room_id, proposer_id, category, title, description, full_details, status, approval_rule, created_at, activated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      proposalActiveId,
      roomId,
      users[0].id,
      "chores",
      "Weekly Chore Rotation",
      "Rotate shared cleaning tasks each week.",
      "Every Sunday 20:00 we rotate chores among all roommates. Tasks include trash, floor, and bathroom.",
      "active",
      "all_members",
      ts(-70),
      ts(-60),
    );
  }

  if (!pendingProposal) {
    database.prepare(
      "insert into proposals (id, room_id, proposer_id, category, title, description, full_details, status, approval_rule, created_at, activated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      proposalPendingId,
      roomId,
      users[1].id,
      "quiet_hours",
      "Quiet Hours 11PM-7AM",
      "Set standard quiet hours on weekdays.",
      "From Monday to Thursday, keep music and speaker volume low between 23:00 and 07:00.",
      "pending",
      "all_members",
      ts(-20),
      null,
    );
  }

  const insertVote = database.prepare(
    "insert or ignore into proposal_votes (id, proposal_id, voter_id, vote_type, comment, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
  );

  for (const user of users) {
    insertVote.run(randomUUID(), proposalActiveId, user.id, "approve", null, ts(-65), ts(-65));
  }
  insertVote.run(randomUUID(), proposalPendingId, users[1].id, "approve", null, ts(-19), ts(-19));
  insertVote.run(randomUUID(), proposalPendingId, users[2].id, "suggest_edit", "Can we make weekends flexible?", ts(-15), ts(-15));

  database.prepare(
    "insert or ignore into agreements (id, proposal_id, room_id, category, title, details, proposer_id, active_since, is_active, approval_status, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    randomUUID(),
    proposalActiveId,
    roomId,
    "chores",
    "Weekly Chore Rotation",
    "Every Sunday 20:00 rotate chores among roommates.",
    users[0].id,
    ts(-60),
    1,
    "3/3 approved",
    ts(-60),
  );

  const insertMessage = database.prepare(
    "insert into messages (id, room_id, sender_id, content, message_type, proposal_id, created_at) values (?, ?, ?, ?, ?, ?, ?)",
  );
  const messageCount = database
    .prepare("select count(*) as count from messages where room_id = ?")
    .get(roomId) as { count: number };
  if ((messageCount.count ?? 0) === 0) {
    insertMessage.run(randomUUID(), roomId, users[0].id, "Hey team, we should formalize cleaning duties.", "user", null, ts(-75));
    insertMessage.run(randomUUID(), roomId, users[0].id, "New proposal created: Weekly Chore Rotation", "proposal_ref", proposalActiveId, ts(-70));
    insertMessage.run(randomUUID(), roomId, null, "System: agreement activated - Weekly Chore Rotation", "system", proposalActiveId, ts(-60));
    insertMessage.run(randomUUID(), roomId, users[1].id, "I propose quiet hours for weekdays.", "user", null, ts(-21));
    insertMessage.run(randomUUID(), roomId, users[1].id, "New proposal created: Quiet Hours 11PM-7AM", "proposal_ref", proposalPendingId, ts(-20));
  }

  const insertNotification = database.prepare(
    "insert into notifications (id, user_id, room_id, type, content, ref_type, ref_id, is_read, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const user of users) {
    const exists = database
      .prepare("select id from notifications where user_id = ? and ref_id = ? and type = ? limit 1")
      .get(user.id, proposalActiveId, "agreement_activated") as { id: string } | undefined;
    if (!exists) {
      insertNotification.run(
        randomUUID(),
        user.id,
        roomId,
        "agreement_activated",
        "Agreement activated: Weekly Chore Rotation",
        "agreement",
        proposalActiveId,
        0,
        ts(-59),
      );
    }
  }
  const pendingNotice = database
    .prepare("select id from notifications where user_id = ? and ref_id = ? and type = ? limit 1")
    .get(users[0].id, proposalPendingId, "proposal_pending") as { id: string } | undefined;
  if (!pendingNotice) {
    insertNotification.run(
      randomUUID(),
      users[0].id,
      roomId,
      "proposal_pending",
      "Pending proposal needs your vote: Quiet Hours 11PM-7AM",
      "proposal",
      proposalPendingId,
      0,
      ts(-10),
    );
  }

  const hasEditHistory = database
    .prepare("select id from proposal_edit_history where proposal_id = ? limit 1")
    .get(proposalActiveId) as { id: string } | undefined;
  if (!hasEditHistory) {
    database.prepare(
      "insert into proposal_edit_history (id, proposal_id, editor_id, previous_category, previous_title, previous_description, previous_full_details, edited_at) values (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      randomUUID(),
      proposalActiveId,
      users[0].id,
      "chores",
      "Weekly Chore Plan",
      "Old draft for cleaning task rotation.",
      "Old details: rotate every Saturday evening.",
      ts(-61),
    );
  }
}

function initSchema(database: Database.Database) {
  database.pragma("journal_mode = WAL");
  database.exec(`
    create table if not exists users (
      id text primary key,
      email text unique not null,
      display_name text not null,
      password_hash text not null,
      created_at text not null
    );

    create table if not exists rooms (
      id text primary key,
      room_name text not null,
      dorm_name text not null,
      invite_code text unique not null,
      created_by text not null,
      created_at text not null
    );

    create table if not exists room_members (
      id text primary key,
      room_id text not null,
      user_id text not null,
      role text not null,
      joined_at text not null,
      unique(room_id, user_id)
    );

    create table if not exists proposals (
      id text primary key,
      room_id text not null,
      proposer_id text not null,
      category text not null,
      title text not null,
      description text not null,
      full_details text not null,
      status text not null,
      approval_rule text not null,
      created_at text not null,
      activated_at text
    );

    create table if not exists messages (
      id text primary key,
      room_id text not null,
      sender_id text,
      content text not null,
      message_type text not null,
      proposal_id text,
      created_at text not null
    );

    create table if not exists proposal_votes (
      id text primary key,
      proposal_id text not null,
      voter_id text not null,
      vote_type text not null,
      comment text,
      created_at text not null,
      updated_at text not null,
      unique(proposal_id, voter_id)
    );

    create table if not exists agreements (
      id text primary key,
      proposal_id text unique not null,
      room_id text not null,
      category text not null,
      title text not null,
      details text not null,
      proposer_id text not null,
      active_since text not null,
      is_active integer not null,
      approval_status text not null,
      created_at text not null
    );

    create table if not exists notifications (
      id text primary key,
      user_id text not null,
      room_id text,
      type text not null,
      content text not null,
      ref_type text,
      ref_id text,
      is_read integer not null,
      created_at text not null
    );

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

    create index if not exists idx_messages_room_created_at on messages(room_id, created_at desc);
    create index if not exists idx_proposals_room_created_at on proposals(room_id, created_at desc);
    create index if not exists idx_notifications_user_read on notifications(user_id, is_read, created_at desc);
    create index if not exists idx_proposal_edit_history_proposal_time on proposal_edit_history(proposal_id, edited_at desc);
  `);
}

export function getLocalDb() {
  if (!db) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    initSchema(db);
    ensureDemoSeed(db);
  }

  return db;
}
