// Đóng gói agent thành 1 file EXE Windows (Node 24 Single Executable Application).
//  1) esbuild gộp agent.mjs + puppeteer-core -> dist/agent.cjs
//  2) tạo SEA blob -> nhúng vào bản sao node.exe -> BNB-CapNhatGia.exe
// Chạy:  node build.mjs
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(DIR, "dist");
const OUT_EXE = path.join(DIR, "BNB-CapNhatGia.exe");
fs.mkdirSync(DIST, { recursive: true });

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", encoding: "utf8", shell: false, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`);
}

// Cấu hình NHÚNG SẴN (URL web + token) → nhân viên nhấn đúp là chạy, không nhập gì.
let baked = { webUrl: "", token: "" };
const bcPath = path.join(DIR, "build-config.json");
try { baked = { ...baked, ...JSON.parse(fs.readFileSync(bcPath, "utf8")) }; } catch { /* */ }
if (baked.webUrl && baked.token) console.log(`★ Nhúng sẵn: ${baked.webUrl}  (token ***${baked.token.slice(-4)})`);
else console.log("⚠ Chưa có build-config.json (webUrl/token) → EXE sẽ hỏi --setup khi chạy. Tạo agent/build-config.json để nhúng sẵn.");

console.log("① Bundle (esbuild)…");
await build({
  entryPoints: [path.join(DIR, "agent.mjs")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outfile: path.join(DIST, "agent.cjs"),
  external: [],
  define: {
    __BAKED_URL__: JSON.stringify(baked.webUrl || ""),
    __BAKED_TOKEN__: JSON.stringify(baked.token || ""),
  },
  banner: { js: "// BNB price agent (bundled)\nglobalThis.__SEA = true;" },
  legalComments: "none",
  minify: false,
});
console.log("   → dist/agent.cjs");

// sea-config
const seaCfg = path.join(DIST, "sea-config.json");
fs.writeFileSync(seaCfg, JSON.stringify({
  main: path.join(DIST, "agent.cjs"),
  output: path.join(DIST, "sea-prep.blob"),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
}, null, 2));

console.log("② Tạo SEA blob…");
run(process.execPath, ["--experimental-sea-config", seaCfg]);

console.log("③ Sao chép node.exe → BNB-CapNhatGia.exe…");
fs.copyFileSync(process.execPath, OUT_EXE);

// gỡ chữ ký số của node.exe (nếu có) để postject không lỗi — bỏ qua nếu signtool không có
try { run("signtool", ["remove", "/s", OUT_EXE]); } catch { /* không sao */ }

console.log("④ Nhúng blob (postject)…");
run("npx", ["--yes", "postject", OUT_EXE, "NODE_SEA_BLOB", path.join(DIST, "sea-prep.blob"),
  "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"], { shell: true });

console.log(`\n✓ Xong: ${OUT_EXE}`);
console.log(baked.webUrl && baked.token
  ? "  Đã nhúng URL+token → gửi nhân viên file này, NHẤN ĐÚP là chạy (không cần nhập gì)."
  : "  CHƯA nhúng config → nhân viên phải chạy:  BNB-CapNhatGia.exe --setup");
