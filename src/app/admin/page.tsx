import { auth, signOut } from "@/lib/auth";

export default async function AdminHomePage() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>관리자 대시보드</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {session?.user?.email}로 로그인됨 (role: {session?.user?.role})
      </p>
      <p style={{ marginBottom: 24 }}>
        고객사 등록/보고서 업로드 등은 Phase 2 이후에 이 화면 아래에 추가됩니다.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button type="submit" style={{ padding: "8px 16px" }}>
          로그아웃
        </button>
      </form>
    </main>
  );
}
