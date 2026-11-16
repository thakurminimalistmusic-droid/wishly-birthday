import { getStore } from "@netlify/blobs";

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": status === 200 ? "public, max-age=300" : "no-store" } });

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const wordCount = (s) => (s.trim().match(/\S+/g) || []).length;
const THEMES = ["neon", "sunset", "mint", "bubble", "gold"];

export default async (req) => {
  const store = getStore("wishes");

  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > 5_000_000) return json({ error: "Too big" }, 413);
    let d;
    try { d = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); }

    const clean = {
      name: str(d.name, 40).trim(),
      from: str(d.from, 40).trim(),
      message: str(d.message, 12000).trim(),
      age: Number.isFinite(+d.age) && +d.age > 0 && +d.age < 121 ? +d.age : "",
      theme: THEMES.includes(d.theme) ? d.theme : "neon",
      photo: typeof d.photo === "string" && d.photo.startsWith("data:image/") ? d.photo : "",
      audio: typeof d.audio === "string" && d.audio.startsWith("data:audio/") ? d.audio : "",
    };
    if (!clean.name || !clean.message) return json({ error: "Missing fields" }, 400);
    if (wordCount(clean.message) > 1000) return json({ error: "Too many words" }, 400);

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => chars[b % chars.length]).join("");
    await store.setJSON(id, clean);
    return json({ id });
  }

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[a-z0-9]{6,12}$/i.test(id)) return json({ error: "Bad id" }, 400);
    const data = await store.get(id, { type: "json" });
    return data ? json(data) : json({ error: "Not found" }, 404);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/wish" };
