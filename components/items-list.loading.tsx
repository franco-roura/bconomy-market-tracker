"use server";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "./ui/input";

export const ItemsListLoading = async () => {
  return (
    <div className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder="Search"
        className="w-full mb-2"
        disabled
      />
      <ScrollArea className="h-[400px] overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="w-full h-20 animate-pulse bg-gray-300 rounded-md mb-2"
          />
        ))}
      </ScrollArea>
    </div>
  );
};
