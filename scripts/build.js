// Build step for Vercel and npm run dev: publishes the latest eval results so How it works ›
// Methodology and the trust line can show them. With no results file, those stay hidden.
import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "eval", "results", "latest.json"), to = path.join(root, "public", "latest.json");
try{
  await copyFile(from, to);
  console.log("Published eval/results/latest.json to public/");
}catch(e){
  if (e.code !== "ENOENT") throw e;
  await rm(to, { force: true });
  console.log("No eval/results/latest.json yet, so Methodology stays hidden.");
}
