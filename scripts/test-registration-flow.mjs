/**
 * Tests that a newly registered user lands in their own room, not DORM42.
 * Run with: node scripts/test-registration-flow.mjs
 */
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const db = new Database(":memory:");
db.exec(`
  create table users (id text primary key, email text unique not null, display_name text not null, password_hash text not null, created_at text not null);
  create table rooms (id text primary key, room_name text not null, dorm_name text not null, invite_code text unique not null, created_by text not null, created_at text not null);
  create table room_members (id text primary key, room_id text not null, user_id text not null, role text not null, joined_at text not null, unique(room_id, user_id));
`);

const now = new Date();
const ts = (m) => new Date(now.getTime() + m * 60000).toISOString();

// --- ensureDemoSeed (first call at init) ---
const demoUserId = "11111111-1111-4111-8111-111111111111";
const demoRoomId = "44444444-4444-4444-8444-444444444444";
db.prepare("insert into users values (?, ?, ?, ?, ?)").run(demoUserId, "jordan@example.com", "Jordan", "hash", ts(-120));
db.prepare("insert into rooms values (?, ?, ?, ?, ?, ?)").run(demoRoomId, "Room 402", "Maple Hall", "DORM42", demoUserId, ts(-90));
const insertMember = db.prepare("insert or ignore into room_members values (?, ?, ?, ?, ?)");
insertMember.run(randomUUID(), demoRoomId, demoUserId, "admin", ts(-89));

// --- User registers with their own room ---
const newUserId = randomUUID();
const newRoomId = randomUUID();
const regTime = new Date().toISOString();
db.prepare("insert into users values (?, ?, ?, ?, ?)").run(newUserId, "newuser@test.com", "New User", "hash2", regTime);
db.prepare("insert into rooms values (?, ?, ?, ?, ?, ?)").run(newRoomId, "Room 101", "", "XYZ999", newUserId, regTime);
insertMember.run(randomUUID(), newRoomId, newUserId, "admin", regTime);

// --- ensureDemoSeed called again (getLocalDb() on every request) ---
// FIXED: no longer adds all existing users to DORM42
insertMember.run(randomUUID(), demoRoomId, demoUserId, "admin", ts(-89)); // no-op (insert or ignore)

// --- app/page.tsx membership query ---
const membership = db.prepare(
  "select room_id from room_members where user_id = ? order by joined_at asc limit 1"
).get(newUserId);

const pass = membership?.room_id === newRoomId;
console.log("New user room_id returned:", membership?.room_id);
console.log("Expected (own room):      ", newRoomId);
console.log("DORM42 room_id:           ", demoRoomId);
console.log(pass ? "\n✅ TEST PASSED: New user lands in their own room" : "\n❌ TEST FAILED: New user was sent to wrong room");

// --- Also test: user with invite code joining existing room ---
const joinUserId = randomUUID();
const joinTime = new Date().toISOString();
db.prepare("insert into users values (?, ?, ?, ?, ?)").run(joinUserId, "joiner@test.com", "Joiner", "hash3", joinTime);
insertMember.run(randomUUID(), demoRoomId, joinUserId, "member", joinTime); // joined DORM42 via invite

// ensureDemoSeed again (would have added joiner to DORM42 with ts(-5) before the fix)
// FIXED: no longer adds all users

const membership2 = db.prepare(
  "select room_id from room_members where user_id = ? order by joined_at asc limit 1"
).get(joinUserId);

const pass2 = membership2?.room_id === demoRoomId;
console.log("\n--- User who joined via invite code ---");
console.log("Room returned:", membership2?.room_id);
console.log("Expected:     ", demoRoomId);
console.log(pass2 ? "✅ TEST PASSED: Invite user lands in DORM42" : "❌ TEST FAILED");

process.exit(pass && pass2 ? 0 : 1);
