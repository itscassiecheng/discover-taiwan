import { input } from "@inquirer/prompts";
import { searchScenicSpot } from "./lib/qdrant.js";
import { spinner } from "./utils/spinner.js";

try {
  while (true) {
    const query = (
      await input({ message: "請輸入要搜尋的景點內容：" })
    ).trim();

    if (query === "") continue;
    if (query.toLowerCase() === "exit") {
      console.log("再會~");
      break;
    }

    const spin = spinner("搜尋中...").start();
    const results = await searchScenicSpot(query, 5);
    spin.stop();

    for (const [i, r] of results.entries()) {
      console.log(`\n${i + 1}. ${r.name || "無名稱"} [${r.opentime || "無開放時間資訊"}]`);
      console.log(`   分數：${r.score.toFixed(3)}`);
      console.log(`   地址：${r.address || "無地址資訊"}`);
      console.log(`   票價：${r.ticketinfo || "無票價資訊"}`);
      console.log(`   描述：${r.description || "無描述資訊"}`);
    }
    console.log();
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會~");
  } else {
    throw err;
  }
}