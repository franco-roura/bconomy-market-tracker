import { items } from "@/app/db/items";
import sharp from "sharp";

// Let's rate-limit the requests to be nice to wewert
const MAX_REQUESTS_PER_SECOND = 10;
const DELAY_BETWEEN_REQUESTS = 1000 / MAX_REQUESTS_PER_SECOND;

let requestCount = 0;
const startTime = performance.now();

for (const item of items) {
  const url = item.imageUrl.startsWith("/")
    ? `https://bconomy.net${item.imageUrl}`
    : item.imageUrl;
  const extension = url.split(".").pop();
  const newPath = `public/assets/game/items/${item.id}.${extension}`;
  if (await Bun.file(newPath).exists()) {
    console.log(`Skipping ${item.idName} because it already exists`);
    continue;
  }
  // Rate limiting logic
  requestCount++;
  const elapsedTime = performance.now() - startTime;
  const expectedTime = requestCount * DELAY_BETWEEN_REQUESTS;

  if (elapsedTime < expectedTime) {
    const delay = expectedTime - elapsedTime;
    console.log(
      `Rate limiting: waiting ${delay.toFixed(0)}ms before next request...`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.log(`Fetching image for ${item.idName} (${item.id}/${items.length})`);

  const response = await fetch(url);
  const stream = new Response(response.body);
  console.log(`Writing image for ${item.idName} (${item.id}/${items.length})`);
  await Bun.write(newPath, stream);
}

// Turn svg's into webp
for (let i = 0; i < items.length; i++) {
  const inputPath = `public/assets/game/items/${i}.svg`;
  const outputPath = `public/assets/game/items/${i}.webp`;
  if (await Bun.file(inputPath).exists()) {
      if (await Bun.file(outputPath).exists()) {
        console.log(`Skipping ${i} because it already exists`);
        continue;
      }
    const content = await Bun.file(inputPath).arrayBuffer();
    await sharp(content).resize(275, 275).webp({ quality: 100 }).toFile(outputPath);
  }
}

console.log("Done");
