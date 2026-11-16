import { getStore } from "@netlify/blobs";

// Runs once a day and deletes wishes older than 30 days.
export default async () => {
  const store = getStore("wishes");
  const { blobs } = await store.list();
  const cutoff = Date.now() - 30 * 864e5;
  for (const { key } of blobs) {
    const m = await store.getMetadata(key);
    const t = m && m.metadata && m.metadata.createdAt;
    if (t && t < cutoff) await store.delete(key);
  }
};

export const config = { schedule: "@daily" };
