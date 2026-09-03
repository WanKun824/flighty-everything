import { mkdir, writeFile } from "node:fs/promises";

// Public-domain source: https://ourairports.com/data/ . Keep the app catalog reproducible.
const url = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const response = await fetch(url);
if (!response.ok) throw new Error(`Airport download failed: ${response.status}`);
const text = await response.text();
const records = [];
let row = [], value = "", quoted = false;
for (let i = 0; i < text.length; i++) {
  const char = text[i];
  if (char === '"') {
    if (quoted && text[i + 1] === '"') { value += '"'; i++; }
    else quoted = !quoted;
  } else if (!quoted && (char === "," || char === "\n")) {
    row.push(value.replace(/\r$/, "")); value = "";
    if (char === "\n") { records.push(row); row = []; }
  } else value += char;
}
const headers = records.shift();
const entries = records.map(values => Object.fromEntries(headers.map((key, index) => [key, values[index]])))
  .filter(record => ["large_airport", "medium_airport", "small_airport", "seaplane_base"].includes(record.type))
  .filter(record => Number.isFinite(Number(record.longitude_deg)) && Number.isFinite(Number(record.latitude_deg)))
  .map(record => [record.iata_code || record.gps_code || record.ident, record.gps_code || record.ident,
    record.name, record.municipality || record.name, record.iso_country, record.continent || "NA",
    Number(Number(record.longitude_deg).toFixed(5)), Number(Number(record.latitude_deg).toFixed(5)),
    record.type === "large_airport" ? 0 : record.scheduled_service === "yes" ? 2 : record.type === "medium_airport" ? 3 : 6]);
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/airports.json", import.meta.url), JSON.stringify({ source: "https://ourairports.com/data/", updated: new Date().toISOString().slice(0, 10), entries }));
console.log(`Saved ${entries.length} airport records.`);
