import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * 관리자 전용 인증. 고객(열람 전용) 사용자는 이 인증 체계를 전혀 거치지 않고,
 * Phase 5에서 별도로 구현할 링크 토큰 + (선택) 비밀번호 방식으로 접근한다.
 * 두 사용자군의 권한 경로를 처음부터 완전히 분리해 관리자 권한이
 * 고객 열람 경로로 새어나가지 않도록 한다.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminPasswordHash) {
          throw new Error(
            "ADMIN_EMAIL / ADMIN_PASSWORD_HASH 환경변수가 설정되지 않았습니다."
          );
        }

        // 이메일 비교는 타이밍 공격 여지가 크지 않으나, 비밀번호는 반드시
        // bcrypt.compare로만 검증한다 (평문 비교 금지).
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
          return null;
        }
        const isValid = await bcrypt.compare(password, adminPasswordHash);
        if (!isValid) {
          return null;
        }

        return { id: "admin", email: adminEmail, role: "admin" as const };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
});
