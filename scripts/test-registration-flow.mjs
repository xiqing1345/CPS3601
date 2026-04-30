/**
 * Tests that a newly registered user lands in their own room, not DORM42.
 * Run with: node scripts/test-registration-flow.mjs
 */
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_ROOM_ID = "44444444-4444-4444-8444-444444444444";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    create table users (id text primary key, email text unique not null, display_name text not null, password_hash text not null, created_at text not null);
    create table rooms (id text primary key, room_name text not null, dorm_name text not null, invite_code text unique not null, created_by text not null, created_at text not null);
    create table room_members (id text primary key, room_id text not null, user_id text not null, role text not null, joined_at text not null, unique(room_id, user_id));
  `);
  return db;
}

function seedDemoRoom(db) {
  const now = new Date();
  const ts = (m) => new Date(now.getTime() + m * 60000).toISOString();
  db.prepare("insert into users values (?, ?, ?, ?, ?)").run(DEMO_USER_ID, "jordan@example.com", "Jordan", "hash", ts(-120));
  db.prepare("insert into rooms values (?, ?, ?, ?, ?, ?)").run(DEMO_ROOM_ID, "Room 402", "Maple Hall", "DORM42", DEMO_USER_ID, ts(-90));
  const insertMember = db.prepare("insert or ignore into room_members values (?, ?, ?, ?, ?)");
  insertMember.run(randomUUID(), DEMO_ROOM_ID, DEMO_USER_ID, "admin", ts(-89));
  return insertMember;
}

function guessDisplayName(email) {
  const local = email.split("@")[0] ?? "student";
  const cleaned = local.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "student";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function ensureUserFromCookies(db, { userId, userEmail }) {
  let user = db.prepare("select id, email, display_name from users where email = ?").get(userEmail);
  if (user) return user;

  db.prepare(
    "insert or ignore into users (id, email, display_name, password_hash, created_at) values (?, ?, ?, ?, ?)",
  ).run(userId, userEmail, guessDisplayName(userEmail), "vercel-demo-cookie-session", new Date().toISOString());

  user = db.prepare("select id, email, display_name from users where email = ?").get(userEmail);
  return user;
}

function ensureRoomFromCookies(db, userId, bootstrap) {
  db.prepare(
    "insert or ignore into rooms (id, room_name, dorm_name, invite_code, created_by, created_at) values (?, ?, ?, ?, ?, ?)",
  ).run(
    bootstrap.roomId,
    bootstrap.roomName,
    bootstrap.dormName,
    bootstrap.inviteCode,
    userId,
    new Date().toISOString(),
  );

  db.prepare(
    "insert or ignore into room_members (id, room_id, user_id, role, joined_at) values (?, ?, ?, ?, ?)",
  ).run(randomUUID(), bootstrap.roomId, userId, bootstrap.role, new Date().toISOString());
}

function firstMembershipRoomId(db, userId) {
  const membership = db
    .prepare("select room_id from room_members where user_id = ? order by joined_at asc limit 1")
    .get(userId);
  return membership?.room_id;
}

function runLocalPersistenceTest() {
  const db = createDb();
  const insertMember = seedDemoRoom(db);

  const newUserId = randomUUID();
  const newRoomId = randomUUID();
  const regTime = new Date().toISOString();
  db.prepare("insert into users values (?, ?, ?, ?, ?)").run(newUserId, "newuser@test.com", "New User", "hash2", regTime);
  db.prepare("insert into rooms values (?, ?, ?, ?, ?, ?)").run(newRoomId, "Room 101", "", "XYZ999", newUserId, regTime);
  insertMember.run(randomUUID(), newRoomId, newUserId, "admin", regTime);
  insertMember.run(randomUUID(), DEMO_ROOM_ID, DEMO_USER_ID, "admin", regTime);

  const roomId = firstMembershipRoomId(db, newUserId);
  const pass = roomId === newRoomId;
  console.log("New user room_id returned:", roomId);
  console.log("Expected (own room):      ", newRoomId);
  console.log("DORM42 room_id:           ", DEMO_ROOM_ID);
  console.log(pass ? "\n✅ TEST PASSED: New user lands in their own room" : "\n❌ TEST FAILED: New user was sent to wrong room");

  const joinUserId = randomUUID();
  const joinTime = new Date().toISOString();
  db.prepare("insert into users values (?, ?, ?, ?, ?)").run(joinUserId, "joiner@test.com", "Joiner", "hash3", joinTime);
  insertMember.run(randomUUID(), DEMO_ROOM_ID, joinUserId, "member", joinTime);

  const joinedRoomId = firstMembershipRoomId(db, joinUserId);
  const invitePass = joinedRoomId === DEMO_ROOM_ID;
  console.log("\n--- User who joined via invite code ---");
  console.log("Room returned:", joinedRoomId);
  console.log("Expected:     ", DEMO_ROOM_ID);
  console.log(invitePass ? "✅ TEST PASSED: Invite user lands in DORM42" : "❌ TEST FAILED");

  return pass && invitePass;
}

function runVercelCrossInstanceTest() {
  const registrationDb = createDb();
  seedDemoRoom(registrationDb);

  const registeredUserId = randomUUID();
  const registeredRoomId = randomUUID();
  const inviteCode = "ROOM88";
  const cookies = {
    userId: registeredUserId,
    userEmail: "freshman@test.com",
    bootstrap: {
      roomId: registeredRoomId,
      roomName: "Room 808",
      dormName: "",
      inviteCode,
      role: "admin",
    },
  };

  registrationDb.prepare("insert into users values (?, ?, ?, ?, ?)").run(
    registeredUserId,
    cookies.userEmail,
    "Freshman",
    "hash4",
    new Date().toISOString(),
  );
  registrationDb.prepare("insert into rooms values (?, ?, ?, ?, ?, ?)").run(
    registeredRoomId,
    cookies.bootstrap.roomName,
    cookies.bootstrap.dormName,
    inviteCode,
    registeredUserId,
    new Date().toISOString(),
  );
  registrationDb.prepare("insert into room_members values (?, ?, ?, ?, ?)").run(
    randomUUID(),
    registeredRoomId,
    registeredUserId,
    "admin",
    new Date().toISOString(),
  );

  const appDb = createDb();
  seedDemoRoom(appDb);
  const restoredUser = ensureUserFromCookies(appDb, cookies);
  ensureRoomFromCookies(appDb, restoredUser.id, cookies.bootstrap);

  const restoredRoomId = firstMembershipRoomId(appDb, restoredUser.id);
  const room = appDb.prepare("select room_name, invite_code from rooms where id = ?").get(registeredRoomId);
  const pass = restoredRoomId === registeredRoomId && room?.invite_code === inviteCode;

  console.log("\n--- Vercel cross-instance recovery ---");
  console.log("Recovered user id:      ", restoredUser.id);
  console.log("Recovered room id:      ", restoredRoomId);
  console.log("Expected recovered room:", registeredRoomId);
  console.log("Recovered invite code:  ", room?.invite_code);
  console.log(pass ? "✅ TEST PASSED: Cookie bootstrap restores user and room on a fresh instance" : "❌ TEST FAILED");

  return pass;
}

const ok = runLocalPersistenceTest() && runVercelCrossInstanceTest();
process.exit(ok ? 0 : 1);
