import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Comprobación optimista de página: solo mira que exista la cookie.
 * La autoridad real es requireUser() en el servidor; aquí no se verifica el JWT.
 */
export function proxy(request: NextRequest) {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "auditsys_session";

  if (request.nextUrl.pathname === "/login") return NextResponse.next();
  if (!request.cookies.has(cookieName)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
