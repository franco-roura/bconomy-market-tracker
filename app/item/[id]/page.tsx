import { db } from "@/app/db/client";
import { items } from "@/app/db/items";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

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
  const currentPrices = await db
    .selectFrom("item_price_history")
    .selectAll()
    .where("item_id", "=", itemIdInt)
    .orderBy("timestamp", "desc")
    .limit(10)
    .execute();

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
            {/* <ItemSelector
              items={gameItems}
              selectedItem={selectedItem}
              onItemSelect={setSelectedItem}
            /> */}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Price History - {selectedItem.name}
              <Image
                width={24}
                height={24}
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                className="w-6 h-6"
              />
            </CardTitle>
          </CardHeader>
          <CardContent>{/* <PriceChart item={selectedItem} /> */}</CardContent>
        </Card>
      </div>

      {/* <ItemStats item={selectedItem} /> */}
    </div>
  );
}
