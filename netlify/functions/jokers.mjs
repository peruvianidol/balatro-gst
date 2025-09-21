import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "_src/_data/jokers.json");

export async function handler(event) {
  const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));

  const params = new URLSearchParams(event.queryStringParameters || {});
  const order = params.get("order") || "alpha";

  let out = [...data];
  if (order === "game") {
    out.sort((a, b) => (a.order ?? 9e9) - (b.order ?? 9e9));
  } else {
    out.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })
    );
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(out),
  };
}
