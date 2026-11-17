export async function onRequestGet({ request, env }) {
  const id = (new URL(request.url).pathname.split("/")[2] || "").replace(/\.jpg$/i, "");
  if (!/^[a-z0-9]{6,12}$/i.test(id)) return new Response("Bad id", { status: 400 });
  const w = await env.WISHES.get(id, "json").catch(() => null);
  const m = w && /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(w.photo || "");
  if (!m) return new Response("Not found", { status: 404 });
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { "content-type": m[1], "cache-control": "public, max-age=86400" } });
}
