import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { client } from "../lib/openai.js";
import {
  qdrant,
  SCENIC_SPOT_COLLECTION,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
} from "../lib/qdrant.js";

const CSV_PATH = "data/taiwan_scenic_spot.csv";
const BATCH_SIZE = 100;

function rowToText(row) {
  return [
    row.Name,
    row.Zone,
    row.Region,
    row.Town,
    row.Class1,
    row.Class2,
    row.Class3,
    row.Keyword,
    row.Toldescribe,
    row.Description,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function recreateCollection() {
  const exists = await qdrant.collectionExists(SCENIC_SPOT_COLLECTION);
  if (exists.exists) {
    await qdrant.deleteCollection(SCENIC_SPOT_COLLECTION);
  }
  await qdrant.createCollection(SCENIC_SPOT_COLLECTION, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });
}

async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const csv = await readFile(CSV_PATH, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`讀到 ${rows.length} 筆資料`);

  await recreateCollection();
  console.log(`已建立 collection: ${SCENIC_SPOT_COLLECTION}`);

  let processed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map(rowToText);
    const vectors = await embedBatch(texts);

    const points = batch.map((row, idx) => ({
      id: i + idx,
      vector: vectors[idx],
      payload: {
        id: row.Id,
        name: row.Name,
        zone: row.Zone,
        description: row.Description,
        tel: row.Tel,
        address: row.Add,
        zipcode: row.Zipcode,
        region: row.Region,
        town: row.Town,
        opentime: row.Opentime,
        picture1: row.Picture1,
        px: row.Px,
        py: row.Py,
        class1: row.Class1,
        class2: row.Class2,
        class3: row.Class3,
        website: row.Website,
        ticketinfo: row.Ticketinfo,
        keyword: row.Keyword,
      },
    }));

    await qdrant.upsert(SCENIC_SPOT_COLLECTION, { wait: true, points });
    processed += batch.length;
    console.log(`進度：${processed} / ${rows.length}`);
  }

  console.log("完成！");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});