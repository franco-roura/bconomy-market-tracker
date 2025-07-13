// ALTER TABLE item_price_candle
// ALTER COLUMN timestamp TYPE timestamp with time zone
// USING timestamp AT TIME ZONE 'UTC';

import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("item_price_candle")
    .alterColumn("timestamp", (col) => col.setDataType("timestamptz"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("item_price_candle")
    .alterColumn("timestamp", (col) => col.setDataType("timestamp"))
    .execute();
}
