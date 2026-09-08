import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

async function authenticate(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/admin/login?error=1");
    }
    // next/navigation의 redirect()는 내부적으로 예외를 던져 리다이렉트를
    // 수행하므로, AuthError가 아닌 경우 반드시 다시 throw해야 정상 동작한다.
    throw error;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>관리자 로그인</h1>
      <form action={authenticate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          이메일
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        {error && (
          <p style={{ color: "crimson", fontSize: 14 }}>
            이메일 또는 비밀번호가 올바르지 않습니다.
          </p>
        )}
        <button type="submit" style={{ padding: "8px 16px", marginTop: 8 }}>
          로그인
        </button>
      </form>
    </main>
  );
}
