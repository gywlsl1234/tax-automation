import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AdminHomePage() {
  const session = await auth();

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>관리자 대시보드</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {session?.user?.email}로 로그인됨 (role: {session?.user?.role})
      </p>
      <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <Link href="/admin/reports/new">보고서 생성(엑셀 업로드)</Link>
        <Link href="/admin/clients">고객사 목록</Link>
        <Link href="/admin/clients/bulk-upload">거래처 일괄 업로드</Link>
      </nav>
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
