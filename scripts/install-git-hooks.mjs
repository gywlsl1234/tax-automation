#!/usr/bin/env node
// npm install 시 자동 실행되어(package.json의 "prepare" 스크립트) 로컬 .git/hooks에
// pre-commit 시크릿 스캔 훅을 설치한다. .git/hooks는 git으로 추적되지 않으므로
// 저장소를 새로 clone할 때마다(=npm install할 때마다) 다시 설치해야 한다.
import { existsSync, copyFileSync, chmodSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const gitDir = join(repoRoot, ".git");

if (!existsSync(gitDir)) {
  // git 저장소가 아닌 환경(예: 일부 CI 캐시)에서는 조용히 스킵한다.
  process.exit(0);
}

const hooksDir = join(gitDir, "hooks");
mkdirSync(hooksDir, { recursive: true });

const src = join(repoRoot, "scripts", "git-hooks", "pre-commit");
const dest = join(hooksDir, "pre-commit");

copyFileSync(src, dest);
chmodSync(dest, 0o755);

console.log("[install-git-hooks] pre-commit 시크릿 스캔 훅을 설치했습니다.");
