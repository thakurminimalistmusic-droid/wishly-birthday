const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": status === 200 ? "public, max-age=300" : "no-store" } });

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const wordCount = (s) => (s.trim().match(/\S+/g) || []).length;
const sec = (v) => { const n = Math.floor(+v); return Number.isFinite(n) && n >= 0 && n < 43200 ? n : 0; };
const THEMES = ["neon", "sunset", "mint", "bubble", "gold"];
const THIRTY_DAYS = 30 * 24 * 60 * 60;

async function saveWish(request, env) {
  const text = await request.text();
  if (text.length > 5_000_000) return json({ error: "Too big" }, 413);
  let d;
  try { d = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); }

  const song = d.song && typeof d.song.id === "string" && /^[\w-]{11}$/.test(d.song.id) ? { id: d.song.id, start: sec(d.song.start), end: sec(d.song.end) } : null;
  const clean = {
    name: str(d.name, 40).trim(),
    from: str(d.from, 40).trim(),
    message: str(d.message, 12000).trim(),
    age: Number.isFinite(+d.age) && +d.age > 0 && +d.age < 121 ? +d.age : "",
    theme: THEMES.includes(d.theme) ? d.theme : "neon",
    photo: typeof d.photo === "string" && d.photo.startsWith("data:image/") ? d.photo : "",
    song,
  };
  if (!clean.name || !clean.message) return json({ error: "Missing fields" }, 400);
  if (wordCount(clean.message) > 1000) return json({ error: "Too many words" }, 400);

  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => chars[b % chars.length]).join("");
  await env.WISHES.put(id, JSON.stringify(clean), { expirationTtl: THIRTY_DAYS });
  return json({ id });
}

async function loadWish(request, env) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-z0-9]{6,40}$/i.test(id)) return json({ error: "Bad id" }, 400);
  const data = await env.WISHES.get(id, "json");
  return data ? json(data) : json({ error: "Not found" }, 404);
}

async function sharePage(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split("/")[2] || "";
  let html = await (await env.ASSETS.fetch(new Request(new URL("/", url.origin)))).text();

  let from = "";
  if (/^[a-z0-9]{6,40}$/i.test(id)) {
    const w = await env.WISHES.get(id, "json").catch(() => null);
    if (w) from = w.from || "";
  }
  const who = from || "Someone";
  const pick = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const teasers = [
    [`${who} sent you something ✨`, "Tap to open it."],
    [`You've got a message 💌`, `From ${who}. Open it.`],
    [`Open this when you're free 👀`, `${who} made it just for you.`],
    [`A little something from ${who} 💫`, "Tap to see."],
    [`${who} made this for you 🎧`, "Turn your sound on."],
    [`This one's for you 💌`, `Sent by ${who}.`],
  ];
  const [tt, dd] = teasers[pick % teasers.length];
  const title = esc(tt), desc = esc(dd);
  html = html
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  const extra = [
    `<meta name="robots" content="noindex, nofollow">`,
    `<meta property="og:url" content="${esc(url.origin + url.pathname)}">`,
    `<meta name="twitter:card" content="summary">`,
  ].join("\n");
  html = html.replace("</head>", extra + "\n</head>");
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow" } });
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (p === "/api/wish") {
      if (request.method === "POST") return saveWish(request, env);
      if (request.method === "GET") return loadWish(request, env);
      return json({ error: "Method not allowed" }, 405);
    }
    if (p.startsWith("/w/") && request.method === "GET") return sharePage(request, env);
    return env.ASSETS.fetch(request);
  },
};
