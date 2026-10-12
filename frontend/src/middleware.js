import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = [
  { matcher: /^\/admin(\/|$)/, role: "admin" },
  { matcher: /^\/profile(\/|$)/, role: "user" },
  { matcher: /^\/orders(\/|$)/, role: "user" },
  { matcher: /^\/checkout(\/|$)/, role: "user" },
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;

  // หา route ที่ต้องป้องกัน
  const route = protectedRoutes.find((r) => r.matcher.test(pathname));
  if (!route) return NextResponse.next();

  if (!token) {
    const login = new URL("/auth/login", req.url);
    login.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // /admin: admins, plus moderators (chat agents, who only get the support inbox)
    if (
      route.role === "admin" &&
      !["admin", "super_admin", "moderator"].includes(payload.role)
    ) {
      return NextResponse.redirect(new URL("/403", req.url));
    }
    if (
      route.role === "user" &&
      !["user", "admin", "super_admin", "moderator"].includes(payload.role)
    ) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  } catch (err) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/orders/:path*", "/checkout/:path*"],
};
