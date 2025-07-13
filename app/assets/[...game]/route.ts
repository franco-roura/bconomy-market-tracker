import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const proxiedResponse = await fetch(`https://bconomy.net${pathname}`);
  return proxiedResponse;
}