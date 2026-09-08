import { DefaultSession } from "next-auth";

declare module "@auth/core/types" {
  interface User {
    role?: "admin";
  }
  interface Session {
    user: {
      role?: "admin";
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: "admin";
  }
}
