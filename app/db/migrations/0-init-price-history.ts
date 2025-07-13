import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('item_price_history')
    .addColumn('id', 'bigint', (col) => col.primaryKey().autoIncrement())
    .addColumn('item_id', 'integer', (col) => col.notNull())
    .addColumn('price', 'numeric', (col) => col.notNull())
    .addColumn('timestamp', 'timestamp', (col) => 
      col.notNull().defaultTo(sql`now()`)
    )
    .addUniqueConstraint('unique_item_timestamp', ['item_id', 'timestamp'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('item_price_history').execute()
}
