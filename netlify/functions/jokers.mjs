// ESM import of JSON so it gets bundled with the function
import data from "../../_src/_data/jokers.json" assert { type: "json" };

export async function handler(event) {
  // 'data' is the parsed array already (no fs needed)
  const params = new URLSearchParams(event.queryStringParameters || {});
  const order = params.get("order") || "alpha";

  const out = [...data];
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
