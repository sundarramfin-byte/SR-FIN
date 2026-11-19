// One-command dev start: Convex (local) -> seed -> Vite.   Usage: npm start
import { spawn, spawnSync } from "node:child_process";

const env = { ...process.env, CONVEX_AGENT_MODE: "anonymous" };
const sh = { env, shell: true };
const children = [];

function stop(code = 0) {
  for (const c of children) c.kill();
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

console.log("▶ Starting Convex backend (local)…");
const convex = spawn("npx convex dev", { ...sh, stdio: ["ignore", "pipe", "pipe"] });
children.push(convex);

let ready = false;
const onData = (buf) => {
  const text = buf.toString();
  process.stdout.write(text);
  if (!ready && /Convex functions ready/i.test(text)) {
    ready = true;
    console.log("\n▶ Seeding banks / settings (safe to repeat)…");
    spawnSync("npx convex run seed:run", { ...sh, stdio: "inherit" });
    console.log("\n▶ Starting app…  open the Local URL shown below\n");
    children.push(spawn("npx vite --port 5173", { ...sh, stdio: "inherit" }));
  }
};
convex.stdout.on("data", onData);
convex.stderr.on("data", onData);
convex.on("exit", (code) => {
  console.error(`Convex backend stopped (code ${code}).`);
  stop(code ?? 1);
});
