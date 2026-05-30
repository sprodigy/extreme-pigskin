export function calculateOwnerRecords(games) {
  const owners = {};

  for (const game of games) {

    const team1 = game.team1;
    const team2 = game.team2;

    if (!owners[team1]) {
      owners[team1] = {
        owner: team1,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gamesPlayed: 0
      };
    }

    if (!owners[team2]) {
      owners[team2] = {
        owner: team2,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gamesPlayed: 0
      };
    }

    owners[team1].pointsFor += game.team1Score;
    owners[team1].pointsAgainst += game.team2Score;
    owners[team1].gamesPlayed++;

    owners[team2].pointsFor += game.team2Score;
    owners[team2].pointsAgainst += game.team1Score;
    owners[team2].gamesPlayed++;

    if (game.team1Score > game.team2Score) {
      owners[team1].wins++;
      owners[team2].losses++;
    } else if (game.team2Score > game.team1Score) {
      owners[team2].wins++;
      owners[team1].losses++;
    } else {
      owners[team1].ties++;
      owners[team2].ties++;
    }
  }

  return Object.values(owners)
    .map(owner => ({
      ...owner,
      winPct:
        owner.gamesPlayed > 0
          ? owner.wins / owner.gamesPlayed
          : 0
    }))
    .sort((a, b) => b.winPct - a.winPct);
}

export function slugifyOwner(ownerName) {
  return ownerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getOwnerList(games) {
  const owners = new Set();

  for (const game of games) {
    owners.add(game.team1);
    owners.add(game.team2);
  }

  return Array.from(owners)
    .sort()
    .map(owner => ({
      owner,
      ownerId: slugifyOwner(owner)
    }));
}

export function getGamesForOwner(games, ownerName) {
  return games.filter(
    game => game.team1 === ownerName || game.team2 === ownerName
  );
}

export function getOwnerRecord(games, ownerName) {
  const ownerGames = getGamesForOwner(games, ownerName);
  const records = calculateOwnerRecords(ownerGames);
  return records.find(record => record.owner === ownerName);
}

export function calculateChampionships(games) {
  const championships = {};

  for (const game of games) {

    if (
      game.gameType === "P" &&
      game.finalSeeding === 1
    ) {

      const winner =
        game.team1Score > game.team2Score
          ? game.team1
          : game.team2;

      const runnerUp =
        game.team1Score > game.team2Score
          ? game.team2
          : game.team1;

      if (!championships[winner]) {
        championships[winner] = {
          championships: 0,
          runnerUps: 0
        };
      }

      if (!championships[runnerUp]) {
        championships[runnerUp] = {
          championships: 0,
          runnerUps: 0
        };
      }

      championships[winner].championships++;
      championships[runnerUp].runnerUps++;
    }
  }

  return championships;
}

export function getOwnerChampionshipResults(games, ownerName) {
  const results = {
    championshipSeasons: [],
    runnerUpSeasons: []
  };

  for (const game of games) {
    if (game.gameType !== "P" || game.finalSeeding !== 1) {
      continue;
    }

    const team1Won = game.team1Score > game.team2Score;

    const champion = team1Won ? game.team1 : game.team2;
    const runnerUp = team1Won ? game.team2 : game.team1;

    if (champion === ownerName) {
      results.championshipSeasons.push(game.year);
    }

    if (runnerUp === ownerName) {
      results.runnerUpSeasons.push(game.year);
    }
  }

  results.championshipSeasons.sort((a, b) => b - a);
  results.runnerUpSeasons.sort((a, b) => b - a);

  return results;
}

export function getChampionshipGames(games) {
  return games
    .filter(game => game.gameType === "P" && game.finalSeeding === 1)
    .map(game => {
      const team1Won = game.team1Score > game.team2Score;

      return {
        year: game.year,
        week: game.week,
        champion: team1Won ? game.team1 : game.team2,
        runnerUp: team1Won ? game.team2 : game.team1,
        championScore: team1Won ? game.team1Score : game.team2Score,
        runnerUpScore: team1Won ? game.team2Score : game.team1Score,
        margin: Math.abs(game.team1Score - game.team2Score)
      };
    })
    .sort((a, b) => b.year - a.year);
}

export function getOpponentRecords(games, ownerName) {
  const rivals = {};

  for (const game of games) {
    let opponent;
    let ownerScore;
    let opponentScore;

    if (game.team1 === ownerName) {
      opponent = game.team2;
      ownerScore = game.team1Score;
      opponentScore = game.team2Score;
    } else if (game.team2 === ownerName) {
      opponent = game.team1;
      ownerScore = game.team2Score;
      opponentScore = game.team1Score;
    } else {
      continue;
    }

    if (!rivals[opponent]) {
      rivals[opponent] = {
        opponent,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gamesPlayed: 0
      };
    }

    rivals[opponent].gamesPlayed++;
    rivals[opponent].pointsFor += ownerScore;
    rivals[opponent].pointsAgainst += opponentScore;

    if (ownerScore > opponentScore) {
      rivals[opponent].wins++;
    } else if (ownerScore < opponentScore) {
      rivals[opponent].losses++;
    } else {
      rivals[opponent].ties++;
    }
  }

  return Object.values(rivals)
    .map(rival => ({
      ...rival,
      winPct:
        rival.gamesPlayed > 0
          ? rival.wins / rival.gamesPlayed
          : 0
    }))
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}

export function getRecordBook(games) {
  const gameRecords = games.map(game => {
    const team1Won = game.team1Score > game.team2Score;

    const winner = team1Won ? game.team1 : game.team2;
    const loser = team1Won ? game.team2 : game.team1;

    const winnerScore = team1Won ? game.team1Score : game.team2Score;
    const loserScore = team1Won ? game.team2Score : game.team1Score;

    return {
      gameId: game.gameId,
      year: game.year,
      week: game.week,
      gameType: game.gameType,
      finalSeeding: game.finalSeeding,
      team1: game.team1,
      team1Score: game.team1Score,
      team2: game.team2,
      team2Score: game.team2Score,
      winner,
      loser,
      winnerScore,
      loserScore,
      margin: Math.abs(game.team1Score - game.team2Score),
      totalPoints: game.team1Score + game.team2Score
    };
  });

  return {
    highestScores: [...gameRecords]
      .flatMap(game => [
        {
          owner: game.team1,
          score: game.team1Score,
          opponent: game.team2,
          opponentScore: game.team2Score,
          year: game.year,
          week: game.week
        },
        {
          owner: game.team2,
          score: game.team2Score,
          opponent: game.team1,
          opponentScore: game.team1Score,
          year: game.year,
          week: game.week
        }
      ])
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),

    lowestScores: [...gameRecords]
      .flatMap(game => [
        {
          owner: game.team1,
          score: game.team1Score,
          opponent: game.team2,
          opponentScore: game.team2Score,
          year: game.year,
          week: game.week
        },
        {
          owner: game.team2,
          score: game.team2Score,
          opponent: game.team1,
          opponentScore: game.team1Score,
          year: game.year,
          week: game.week
        }
      ])
      .sort((a, b) => a.score - b.score)
      .slice(0, 10),

    biggestBlowouts: [...gameRecords]
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10),

    closestGames: [...gameRecords]
      .filter(game => game.margin > 0)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 10),

    highestCombinedScores: [...gameRecords]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10),

    lowestWinningScores: [...gameRecords]
      .filter(game => game.winnerScore > game.loserScore)
      .sort((a, b) => a.winnerScore - b.winnerScore)
      .slice(0, 10)
  };
}

export function getSeasonList(games) {
  return Array.from(new Set(games.map(game => game.year)))
    .sort((a, b) => b - a);
}

export function getGamesForSeason(games, year) {
  return games
    .filter(game => game.year === Number(year))
    .sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return a.gameId - b.gameId;
    });
}

export function calculateSeasonStandings(games, year) {
  const seasonGames = getGamesForSeason(games, year);

  return calculateOwnerRecords(seasonGames)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.pointsFor - a.pointsFor;
    });
}
export function calculateRegularSeasonStandings(games, year) {
  const regularSeasonGames = getGamesForSeason(games, year)
    .filter(game => game.gameType === "R");

  return calculateOwnerRecords(regularSeasonGames)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.pointsFor - a.pointsFor;
    });
}

export function getPlayoffGamesForSeason(games, year) {
  return getGamesForSeason(games, year)
    .filter(game => game.gameType === "P" || game.gameType === "C");
}

export function getSeasonFinishers(games, year) {
  const playoffGames = getPlayoffGamesForSeason(games, year);

  const championshipGame = playoffGames.find(
    game => game.gameType === "P" && game.finalSeeding === 1
  );

  const toiletBowlGame = playoffGames.find(
    game => game.gameType === "C" && game.finalSeeding === 11
  );

  function getWinnerLoser(game) {
    if (!game) return null;

    const team1Won = game.team1Score > game.team2Score;

    return {
      winner: team1Won ? game.team1 : game.team2,
      loser: team1Won ? game.team2 : game.team1,
      winnerScore: team1Won ? game.team1Score : game.team2Score,
      loserScore: team1Won ? game.team2Score : game.team1Score
    };
  }

  const championship = getWinnerLoser(championshipGame);
  const toiletBowl = getWinnerLoser(toiletBowlGame);

  return {
    champion: championship?.winner ?? null,
    runnerUp: championship?.loser ?? null,
    championScore: championship?.winnerScore ?? null,
    runnerUpScore: championship?.loserScore ?? null,

    toiletBowlWinner: toiletBowl?.winner ?? null,
    toiletBowlLoser: toiletBowl?.loser ?? null,
    toiletBowlWinnerScore: toiletBowl?.winnerScore ?? null,
    toiletBowlLoserScore: toiletBowl?.loserScore ?? null
  };
}