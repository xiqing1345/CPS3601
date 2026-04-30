import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of ["local_user_id", "local_user_email", "local_room_bootstrap"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
