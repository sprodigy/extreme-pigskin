import fs from "fs";
import csv from "csv-parser";

const results = [];

fs.createReadStream("data/Game_Log.csv")
  .pipe(csv())
  .on("data", (row) => {

    // Skip repeated header rows
    if (row["Game Count"] === "Game Count") {
      return;
    }

    // Skip blank rows
    if (!row["Game Count"]) {
      return;
    }

    const game = {
      gameId: Number(row["Game Count"]),
      year: Number(row["Year"]),
      week: Number(row["Week"]),

      team1: row["Team 1"],
      team1Score: Number(row["Team 1 Score"]),

      team2: row["Team 2"],
      team2Score: Number(row["Team 2 Score"]),

      gameType: row["Game Type"],
      finalSeeding: Number(row["Final Seeding"] || 0)
    };

    results.push(game);
  })
  .on("end", () => {

    // Sort by game id
    results.sort((a, b) => a.gameId - b.gameId);

    // Create output folder if needed
    fs.mkdirSync("public/data", { recursive: true });

    fs.writeFileSync(
      "public/data/game-log.json",
      JSON.stringify(results, null, 2)
    );

    console.log(`Created ${results.length} games.`);
  });