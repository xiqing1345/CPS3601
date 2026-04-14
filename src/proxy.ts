import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isLocalMode } from "@/lib/localdb/mode";

export async function proxy(request: NextRequest) {
  if (isLocalMode()) {
    const pathname = request.nextUrl.pathname;
    const protectedPath = pathname.startsWith("/app") || pathname.startsWith("/onboarding");
    const hasLocalSession = Boolean(
      request.cookies.get("local_user_email")?.value || request.cookies.get("local_user_id")?.value,
    );

    if (!hasLocalSession && protectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
