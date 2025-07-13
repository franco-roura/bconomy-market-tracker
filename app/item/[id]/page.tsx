import { db } from "@/app/db/client";
import { items } from "@/app/db/items";
import { ItemStats } from "@/components/item-stats";
import { ItemsList } from "@/components/items-list";
import { ItemsListLoading } from "@/components/items-list.loading";
import { PriceChart } from "@/components/price-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Suspense } from "react";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-static";
export const revalidate = 300;

export default async function Home(props: Props) {
  const { id } = await props.params;
  const itemIdInt = parseInt(id ?? "111");
  const selectedItem = items[itemIdInt];
  let utcMidnight = new Date();
  utcMidnight.setUTCHours(0, 0, 0, 0);
  console.log(utcMidnight);
  const currentPrices = await db
    .selectFrom("item_price_candle")
    .selectAll()
    .where("item_id", "=", itemIdInt)
    .where("interval", "=", "1h")
    .where("timestamp", ">=", utcMidnight)
    .orderBy("timestamp", "asc")
    .execute();

  const currentStats = await db
    .selectFrom("live_stats")
    .selectAll()
    .where("item_id", "=", itemIdInt)
    .executeTakeFirst();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Bconomy Market Tracker
        </h1>
        <p className="text-muted-foreground">
          Monitor game item prices over the past day
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Item</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ItemsListLoading />}>
              <ItemsList selectedItemId={itemIdInt} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Price History - {selectedItem.name}
              <Image
                width={24}
                height={24}
                src={`/assets/game/items/${selectedItem.id}.webp`}
                alt={selectedItem.name}
                className="w-6 h-6"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={currentPrices.map((price) => ({
                id: price.id,
                item_id: price.item_id,
                timestamp: price.timestamp.getTime(),
                open: parseInt(price.open),
                high: parseInt(price.high),
                low: parseInt(price.low),
                close: parseInt(price.close),
              }))}
            />
          </CardContent>
        </Card>
      </div>
      <ItemStats
        itemId={itemIdInt}
        lastKnownPrice={parseInt(currentStats?.last_known_price ?? "0")}
        openingPrice={parseInt(currentStats?.opening_price ?? "0")}
        highestPriceToday={parseInt(currentStats?.highest_price_today ?? "0")}
        lowestPriceToday={parseInt(currentStats?.lowest_price_today ?? "0")}
        supply={parseInt(currentStats?.supply ?? "0")}
      />
    </div>
  );
}
