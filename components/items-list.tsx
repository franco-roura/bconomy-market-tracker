"use client";

import { GameItem, items } from "@/app/db/items";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { bcFormatter } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Input } from "./ui/input";

const formatter = new Intl.NumberFormat();

type ItemCardProps = {
  item: GameItem;
  selected: boolean;
  stats?: { supply: string; last_known_price: string };
};

const ItemCard = (props: ItemCardProps) => {
  return (
    <Link key={props.item.id} href={`/item/${props.item.id}`}>
      <Button
        variant={props.selected ? "default" : "outline"}
        className="w-full justify-start h-auto p-3 text-left mb-2 cursor-pointer"
      >
        <div className="flex items-center space-x-3 w-full">
          <Image
            width={24}
            height={24}
            src={`/assets/game/items/${props.item.id}.webp`}
            alt={props.item.name}
            className="w-6 h-6"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{props.item.name}</div>
            <div className="text-sm text-muted-foreground">
              {bcFormatter.format(
                parseInt(props.stats?.last_known_price ?? "0"),
              )}{" "}
              BC
            </div>
            <div className="text-xs text-muted-foreground">
              Qty: {formatter.format(parseInt(props.stats?.supply ?? "0"))}
            </div>
          </div>
        </div>
      </Button>
    </Link>
  );
};

type Props = {
  selectedItemId: number;
  currentStats: Array<{
    item_id: number;
    supply: string;
    last_known_price: string;
  }>;
};

export const ItemsList = (props: Props) => {
  const [search, setSearch] = useState("");
  const statsByItemId = props.currentStats.reduce(
    (acc, stat) => {
      acc[stat.item_id] = {
        supply: stat.supply,
        last_known_price: stat.last_known_price,
      };
      return acc;
    },
    {} as Record<number, { supply: string; last_known_price: string }>,
  );
  return (
    <div className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder="Search"
        className="w-full mb-2"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea className="h-[400px]">
        <ItemCard
          item={items[props.selectedItemId]}
          stats={statsByItemId[props.selectedItemId]}
          selected
        />
        {items
          .filter(
            (item) =>
              item.id !== props.selectedItemId &&
              item.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              stats={statsByItemId[item.id]}
              selected={item.id === props.selectedItemId}
            />
          ))}
      </ScrollArea>
    </div>
  );
};
