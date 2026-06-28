import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { isAdminEmail } from "@/lib/admin-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = profile?.email;
      const emailVerified = profile?.email_verified === true;

      return emailVerified && isAdminEmail(email);
    },
    jwt({ token, profile }) {
      const email = profile?.email ?? token.email;

      if (isAdminEmail(email)) {
        token.role = "admin";
      } else {
        delete token.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.role === "admin") {
        session.user.role = "admin";
      }

      return session;
    },
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isLoginPage = pathname === "/admin/login";
      const isProtectedPath =
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/pos" ||
        pathname.startsWith("/pos/");
      const isAdmin = auth?.user?.role === "admin";

      if (isLoginPage) {
        return isAdmin
          ? Response.redirect(new URL("/admin", request.nextUrl))
          : true;
      }

      if (isProtectedPath) {
        return isAdmin;
      }

      return true;
    },
  },
});
