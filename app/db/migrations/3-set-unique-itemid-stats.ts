import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("live_stats")
    .addUniqueConstraint("unique_item_id", ["item_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("live_stats")
    .dropConstraint("unique_item_id")
    .execute();
}
