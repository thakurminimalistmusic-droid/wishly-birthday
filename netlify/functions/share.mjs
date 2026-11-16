import { getStore } from "@netlify/blobs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/")[2] || "";
  let html = await (await fetch(new URL("/index.html", url.origin))).text();

  if (/^[a-z0-9]{6,12}$/i.test(id)) {
    const w = await getStore("wishes").get(id, { type: "json" }).catch(() => null);
    if (w && w.name) {
      const title = esc(`A birthday wish for ${w.name} 🎂`);
      const desc = esc(w.from ? `${w.from} made you something. Open it.` : "Someone made you something. Open it.");
      html = html
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}">`)
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
      const extra = [
        `<meta property="og:url" content="${esc(url.origin + url.pathname)}">`,
        `<meta name="twitter:card" content="${w.photo ? "summary_large_image" : "summary"}">`,
        w.photo ? `<meta property="og:image" content="${esc(url.origin)}/og/${esc(id)}.jpg">` : "",
      ].join("\n");
      html = html.replace("</head>", extra + "\n</head>");
    }
  }
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
};

export const config = { path: "/w/*" };
