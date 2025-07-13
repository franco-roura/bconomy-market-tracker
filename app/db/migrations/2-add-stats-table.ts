import { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('live_stats')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('item_id', 'integer', (col) => col.notNull())
    .addColumn('last_known_price', 'bigint', (col) => col.notNull())
    .addColumn('opening_price', 'bigint', (col) => col.notNull())
    .addColumn('highest_price_today', 'bigint', (col) => col.notNull())
    .addColumn('lowest_price_today', 'bigint', (col) => col.notNull())
    .addColumn('supply', 'bigint', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("live_stats_item_id")
    .on("live_stats")
    .column("item_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("live_stats_item_id").execute();
  await db.schema.dropTable("live_stats").execute();
}