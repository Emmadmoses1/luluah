import { mkdirSync, writeFileSync } from "node:fs";
import { buildQuery, elementsToRows, toCsv } from "./lib/osm.mjs";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const DEFAULT = ["SA", "KW", "EG", "JO", "IQ", "OM", "TN", "SD"];
const wanted = (process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT).map((c) => c.toUpperCase());
mkdirSync("data/osm", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(iso) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "luluah-store-importer/1.0" },
        body: new URLSearchParams({ data: buildQuery(iso) }), signal: AbortSignal.timeout(200000),
      });
      if (res.status === 429 || res.status === 504) { console.log(`${iso}: server busy (${res.status}), retrying in 30s…`); await sleep(30000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = elementsToRows(await res.json(), iso);
      if (rows.length === 0) { console.log(`${iso}: no postal data found in OpenStreetMap`); return; }
      writeFileSync(`data/osm/${iso}.csv`, toCsv(rows));
      console.log(`${iso}: ${rows.length} rows -> data/osm/${iso}.csv`);
      return;
    } catch (e) {
      console.log(`${iso}: attempt ${attempt} failed (${e.message})`);
      await sleep(15000);
    }
  }
  console.log(`${iso}: gave up`);
}

for (const iso of wanted) { await run(iso); await sleep(10000); }
console.log("Done. Review the CSV files, then import each with: npm run places:import-csv -- data/osm/XX.csv");
