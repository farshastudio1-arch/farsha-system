import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getD1Database(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.DB) {
    throw new Error("Cloudflare D1 binding DB is not available.");
  }

  return env.DB;
}
