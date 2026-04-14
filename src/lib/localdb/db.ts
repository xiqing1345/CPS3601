import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "local-demo.db");

let db: Database.Database | null = null;

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
  }

  return db;
}
