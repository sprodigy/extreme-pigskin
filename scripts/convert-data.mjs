import fs from "fs";
import csv from "csv-parser";

const results = [];
const skipped = [];

fs.createReadStream("data/Game_Log.csv")
  .pipe(csv())
  .on("data", (row) => {
    const gameCount = Number(row["Game Count"]);
    const year = Number(row["Year"]);
    const week = Number(row["Week"]);
    const team1Score = Number(row["Team 1 Score"]);
    const team2Score = Number(row["Team 2 Score"]);
    const gameType = row["Game Type"]?.trim();

    // Skip repeated headers, blanks, formula junk, and invalid rows
    const isValidGame =
      Number.isInteger(gameCount) &&
      Number.isInteger(year) &&
      year >= 2010 &&
      year <= 2030 &&
      Number.isInteger(week) &&
      week >= 1 &&
      week <= 18 &&
      row["Team 1"] &&
      row["Team 2"] &&
      !Number.isNaN(team1Score) &&
      !Number.isNaN(team2Score) &&
      ["R", "P", "C", "-"].includes(gameType);

    if (!isValidGame) {
      skipped.push(row);
      return;
    }

    const game = {
      gameId: gameCount,
      year,
      week,

      team1: row["Team 1"].trim(),
      team1Score,

      team2: row["Team 2"].trim(),
      team2Score,

      gameType,
      finalSeeding: Number(row["Final Seeding"] || 0),
    };

    results.push(game);
  })
  .on("end", () => {
    results.sort((a, b) => a.gameId - b.gameId);

    fs.mkdirSync("public/data", { recursive: true });

    fs.writeFileSync(
      "public/data/game-log.json",
      JSON.stringify(results, null, 2)
    );

    fs.writeFileSync(
      "public/data/skipped-rows.json",
      JSON.stringify(skipped, null, 2)
    );

    console.log(`Created ${results.length} valid games.`);
    console.log(`Skipped ${skipped.length} invalid rows.`);
  });