// netlify/functions/stickers.mjs
// GET  /api/stickers           -> { checked: [...] }
// PATCH /api/stickers {checked} -> echoes saved
let memory = { checked: [] }; // fine for dev/hackathon; we can upgrade later

export async function handler(event) {
  const method = event.httpMethod;

  if (method === "GET") {
    return json(memory);
  }

  if (method === "PATCH") {
    const body = safeJson(event.body);
    const list = Array.isArray(body.checked) ? [...new Set(body.checked.map(String))] : [];
    memory = { checked: list };
    return json(memory);
  }

  return { statusCode: 405, body: "Use GET or PATCH" };
}

const json = (b, s=200) => ({
  statusCode: s,
  headers: { "content-type":"application/json; charset=utf-8" },
  body: JSON.stringify(b)
});

function safeJson(s) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
