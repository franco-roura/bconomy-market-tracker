import { items } from "@/app/db/items";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bcFormatter } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";

type Props = {
  itemId: number;
  lastKnownPrice: number;
  openingPrice: number;
  highestPriceToday: number;
  lowestPriceToday: number;
  supply: number;
};

export const ItemStats = (props: Props) => {
  // Calculate price change over the past 24 hours
  const firstPrice = props.openingPrice;
  const lastPrice = props.lastKnownPrice;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = ((priceChange / firstPrice) * 100);

  // Calculate min/max prices
  const minPrice = props.lowestPriceToday;
  const maxPrice = props.highestPriceToday;

  const getPriceChangeIcon = () => {
    if (priceChange > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (priceChange < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPriceChangeColor = () => {
    if (priceChange > 0) return "text-green-500";
    if (priceChange < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Price</CardTitle>
            <Image
                src={`/assets/game/items/${props.itemId}.webp`}
                alt={`${items[props.itemId].name}`}
                width={20}
                height={20}
                className="w-5 h-5"
            />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{bcFormatter.format(props.lastKnownPrice)} BC</div>
          <div className={`flex items-center space-x-1 text-sm ${getPriceChangeColor()}`}>
            {getPriceChangeIcon()}
            <span>
              {priceChange >= 0 ? "+" : ""}{bcFormatter.format(priceChange)} BC ({priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h High</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{bcFormatter.format(maxPrice)} BC</div>
          <p className="text-xs text-muted-foreground">Highest price today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Low</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{bcFormatter.format(minPrice)} BC</div>
          <p className="text-xs text-muted-foreground">Lowest price today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Quantity</CardTitle>
          <span className="text-sm text-muted-foreground">📦</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{bcFormatter.format(props.supply)}</div>
          <p className="text-xs text-muted-foreground">Items in circulation</p>
        </CardContent>
      </Card>
    </div>
  );
};
