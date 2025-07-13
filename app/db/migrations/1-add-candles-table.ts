import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('item_price_candle')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('interval', 'varchar(2)', (col) => col.notNull()) // 1h, 1d
    .addColumn('item_id', 'integer', (col) => col.notNull())
    .addColumn('open', 'bigint', (col) => col.notNull())
    .addColumn('high', 'bigint', (col) => col.notNull())
    .addColumn('low', 'bigint', (col) => col.notNull())
    .addColumn('close', 'bigint', (col) => col.notNull())
    .addColumn('timestamp', 'timestamp', (col) => col.notNull())
    .addUniqueConstraint('unique_item_timestamp_interval', ['item_id', 'timestamp', 'interval'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('item_price_candle').execute()
}