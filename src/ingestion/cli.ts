/**
 * CLI runner for local ingestion.
 * Run: npm run ingest
 */

import { runIngestion } from "./index";

(async () => {
  console.log("🔄 Running ingestion job...\n");
  try {
    const summary = await runIngestion();
    for (const r of summary.results) {
      const status = r.errors.length ? "⚠️" : "✅";
      console.log(
        `${status} ${r.source}: raw=${r.articlesRaw} matched=${r.articlesFound} created=${r.articlesCreated} duped=${r.articlesDuped}`
      );
      if (r.errors.length) {
        console.log(`   Errors: ${r.errors.join(", ")}`);
      }
    }
    console.log(`\n✅ Ingestion complete — ${summary.totalCreated} new, ${summary.totalDuped} duped`);
  } catch (err) {
    console.error("❌ Ingestion failed:", err);
    process.exit(1);
  }
  process.exit(0);
})();
