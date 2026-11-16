import { getStore } from "@netlify/blobs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/")[2] || "";
  let html = await (await fetch(new URL("/index.html", url.origin))).text();

  let from = "", photo = false;
  if (/^[a-z0-9]{6,12}$/i.test(id)) {
    const w = await getStore("wishes").get(id, { type: "json" }).catch(() => null);
    if (w) { from = w.from || ""; photo = !!w.photo; }
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
    `<meta property="og:url" content="${esc(url.origin + url.pathname)}">`,
    `<meta name="twitter:card" content="${photo ? "summary_large_image" : "summary"}">`,
    photo ? `<meta property="og:image" content="${esc(url.origin)}/og/${esc(id)}.jpg">` : "",
  ].join("\n");
  html = html.replace("</head>", extra + "\n</head>");
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
};

export const config = { path: "/w/*" };
