import { getD1Database } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

type CountRow = {
  count: number;
};

export async function GET() {
  try {
    const db = await getD1Database();

    const [catalogCount, cmsCount] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM kebaya_items").first<CountRow>(),
      db
        .prepare("SELECT COUNT(*) AS count FROM cms_content WHERE id = ?")
        .bind("main")
        .first<CountRow>(),
    ]);

    return Response.json({
      ok: true,
      binding: "DB",
      catalogItemCount: Number(catalogCount?.count ?? 0),
      cmsContentPresent: Number(cmsCount?.count ?? 0) > 0,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        binding: "DB",
        error: error instanceof Error ? error.message : "D1 health check failed.",
      },
      { status: 500 },
    );
  }
}
