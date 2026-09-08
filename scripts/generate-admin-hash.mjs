#!/usr/bin/env node
// 사용법: node scripts/generate-admin-hash.mjs <평문비밀번호>
// 출력된 해시를 .env.local의 ADMIN_PASSWORD_HASH 값으로 사용하세요.
// 평문 비밀번호는 어디에도 저장하지 마세요.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("사용법: node scripts/generate-admin-hash.mjs <평문비밀번호>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
// Next.js는 .env 파일에서 $VAR 형태를 변수 참조로 확장하므로, bcrypt 해시의
// '$' 문자는 .env.local에 넣을 때 반드시 '\$'로 이스케이프해야 한다.
const escapedForEnvFile = hash.replace(/\$/g, "\\$");

console.log("원본 해시 (DB에 직접 저장하는 등의 용도):");
console.log(hash);
console.log("\n.env.local의 ADMIN_PASSWORD_HASH에 넣을 값 (이스케이프됨):");
console.log(escapedForEnvFile);
