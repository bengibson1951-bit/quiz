// Validates every question set in sets/ and checks sets/index.json.
// Usage: npm run validate
import { readFileSync, readdirSync } from "node:fs";
import { validateSet } from "../sets.js";

const dir = new URL("../sets/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));
let bad = 0;

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "index.json");
for (const f of files) {
  const problems = [];
  let set;
  try {
    set = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  } catch (e) {
    problems.push("invalid JSON: " + e.message);
  }
  if (set) {
    const v = validateSet(set);
    if (!v.ok) problems.push(v.error);
    const entry = index.find((e) => e.file === f);
    if (!entry) problems.push("not listed in index.json");
    else {
      if (entry.id !== set.id) problems.push(`index id "${entry.id}" != set id "${set.id}"`);
      if (entry.count !== set.questions?.length) problems.push(`index count ${entry.count} != ${set.questions?.length}`);
    }
    const n = set.questions?.length ?? 0;
    const mc = set.questions?.filter((q) => q.type === "mc").length ?? 0;
    console.log(`${problems.length ? "FAIL" : "ok  "} ${f}: ${n} questions (${mc} mc, ${n - mc} text)${problems.length ? "\n     - " + problems.join("\n     - ") : ""}`);
  } else {
    console.log(`FAIL ${f}: ${problems.join("; ")}`);
  }
  if (problems.length) bad++;
}
for (const entry of index) {
  if (!files.includes(entry.file)) { console.log(`FAIL index.json lists missing file ${entry.file}`); bad++; }
}
process.exit(bad ? 1 : 0);
