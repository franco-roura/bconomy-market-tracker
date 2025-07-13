"use client";

import { GameItem, items } from "@/app/db/items";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Input } from "./ui/input";

const formatter = new Intl.NumberFormat();

type ItemCardProps = {
  item: GameItem;
  selected: boolean;
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
            src={props.item.imageUrl}
            alt={props.item.name}
            className="w-6 h-6"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{props.item.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatter.format(props.item.cost)} BC
            </div>
            <div className="text-xs text-muted-foreground">
              Qty: {formatter.format(props.item.quantity || 0)}
            </div>
          </div>
        </div>
      </Button>
    </Link>
  );
};

type Props = {
  selectedItemId: number;
};

export const ItemsList = (props: Props) => {
  const [search, setSearch] = useState("");
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
          selected
        />
        {items
          .filter(
            (item) =>
              item.id !== props.selectedItemId &&
              item.name.toLowerCase().includes(search.toLowerCase())
          )
          .map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              selected={item.id === props.selectedItemId}
            />
          ))}
      </ScrollArea>
    </div>
  );
};
