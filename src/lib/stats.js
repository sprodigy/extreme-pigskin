import { championshipOverrides } from "./leagueOverrides";

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
      winPct: owner.gamesPlayed > 0 ? owner.wins / owner.gamesPlayed : 0
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

export function calculateChampionships(games) {
  const championships = {};

  function ensureOwner(owner) {
    if (!championships[owner]) {
      championships[owner] = {
        championships: 0,
        runnerUps: 0
      };
    }
  }

  const sharedTitleYears = new Set(
    championshipOverrides
      .filter(override => override.type === "shared_championship")
      .map(override => override.year)
  );

  for (const game of games) {
    if (game.gameType !== "P" || game.finalSeeding !== 1) continue;

    if (sharedTitleYears.has(game.year)) {
      continue;
    }

    const team1Won = game.team1Score > game.team2Score;

    const winner = team1Won ? game.team1 : game.team2;
    const runnerUp = team1Won ? game.team2 : game.team1;

    ensureOwner(winner);
    ensureOwner(runnerUp);

    championships[winner].championships++;
    championships[runnerUp].runnerUps++;
  }

  for (const override of championshipOverrides) {
    if (override.type !== "shared_championship") continue;

    for (const owner of override.owners) {
      ensureOwner(owner);
      championships[owner].championships++;
    }
  }

  return championships;
}

export function getChampionshipGames(games) {
  return games
    .filter(game => game.gameType === "P" && game.finalSeeding === 1)
    .map(game => {
      const override = championshipOverrides.find(
        item =>
          item.type === "shared_championship" &&
          item.year === game.year
      );

      const team1Won = game.team1Score > game.team2Score;

      const normalChampion = team1Won ? game.team1 : game.team2;
      const normalRunnerUp = team1Won ? game.team2 : game.team1;
      const championScore = team1Won ? game.team1Score : game.team2Score;
      const runnerUpScore = team1Won ? game.team2Score : game.team1Score;

      if (override) {
        return {
          year: game.year,
          week: game.week,
          champion: override.owners.join(" / "),
          runnerUp: "N/A",
          championScore,
          runnerUpScore,
          margin: Math.abs(game.team1Score - game.team2Score),
          isSharedChampionship: true,
          note: override.note
        };
      }

      return {
        year: game.year,
        week: game.week,
        champion: normalChampion,
        runnerUp: normalRunnerUp,
        championScore,
        runnerUpScore,
        margin: Math.abs(game.team1Score - game.team2Score),
        isSharedChampionship: false,
        note: null
      };
    })
    .sort((a, b) => b.year - a.year);
}

export function getOwnerChampionshipResults(games, ownerName) {
  const results = {
    championshipSeasons: [],
    runnerUpSeasons: []
  };

  const sharedTitleYears = new Set(
    championshipOverrides
      .filter(override => override.type === "shared_championship")
      .map(override => override.year)
  );

  for (const game of games) {
    if (game.gameType !== "P" || game.finalSeeding !== 1) continue;

    if (sharedTitleYears.has(game.year)) {
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

  for (const override of championshipOverrides) {
    if (override.type !== "shared_championship") continue;

    if (override.owners.includes(ownerName)) {
      results.championshipSeasons.push(override.year);
    }
  }

  results.championshipSeasons.sort((a, b) => b - a);
  results.runnerUpSeasons.sort((a, b) => b - a);

  return results;
}

export function getSeasonFinishers(games, year) {
  const playoffGames = getPlayoffGamesForSeason(games, year);

  const championshipGame = playoffGames.find(
    game => game.gameType === "P" && game.finalSeeding === 1
  );

  const consolationPlacementGames = playoffGames
    .filter(game => game.gameType === "C")
    .filter(game => Number(game.finalSeeding) > 0);

  const toiletBowlGame = consolationPlacementGames
    .sort((a, b) => Number(b.finalSeeding) - Number(a.finalSeeding))[0];

  function getWinnerLoser(game) {
    if (!game) return null;

    const team1Won = game.team1Score > game.team2Score;

    return {
      winner: team1Won ? game.team1 : game.team2,
      loser: team1Won ? game.team2 : game.team1,
      winnerScore: team1Won ? game.team1Score : game.team2Score,
      loserScore: team1Won ? game.team2Score : game.team1Score,
      finalSeeding: Number(game.finalSeeding)
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
    toiletBowlLoserScore: toiletBowl?.loserScore ?? null,
    toiletBowlSeeding: toiletBowl?.finalSeeding ?? null
  };
}

export function calculateLastPlaceFinishes(games) {
  const lastPlaces = {};
  const seasons = getSeasonList(games);

  for (const year of seasons) {
    const seasonFinishers = getSeasonFinishers(games, year);

    if (!seasonFinishers.toiletBowlLoser) continue;

    if (!lastPlaces[seasonFinishers.toiletBowlLoser]) {
      lastPlaces[seasonFinishers.toiletBowlLoser] = 0;
    }

    lastPlaces[seasonFinishers.toiletBowlLoser]++;
  }

  return lastPlaces;
}

export function calculateToiletBowls(games) {
  return calculateLastPlaceFinishes(games);
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
      winPct: rival.gamesPlayed > 0 ? rival.wins / rival.gamesPlayed : 0
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

  const ownerScores = gameRecords.flatMap(game => [
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
  ]);

  return {
    highestScores: [...ownerScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),

    lowestScores: [...ownerScores]
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

export function getTopTeamsByWeek(games, year) {
  const seasonGames = getGamesForSeason(games, year);
  const weeklyScores = {};

  for (const game of seasonGames) {
    if (!weeklyScores[game.week]) {
      weeklyScores[game.week] = [];
    }

    weeklyScores[game.week].push({
      week: game.week,
      owner: game.team1,
      score: game.team1Score,
      opponent: game.team2,
      opponentScore: game.team2Score,
      gameType: game.gameType
    });

    weeklyScores[game.week].push({
      week: game.week,
      owner: game.team2,
      score: game.team2Score,
      opponent: game.team1,
      opponentScore: game.team1Score,
      gameType: game.gameType
    });
  }

  return Object.entries(weeklyScores)
    .map(([week, scores]) => {
      const topScore = scores.sort((a, b) => b.score - a.score)[0];

      return {
        week: Number(week),
        ...topScore
      };
    })
    .sort((a, b) => a.week - b.week);
}

export function getOwnerSeasonRecords(games, ownerName, gameType = "R") {
  const ownerGames = getGamesForOwner(games, ownerName)
    .filter(game => game.gameType === gameType);

  const seasons = Array.from(
    new Set(ownerGames.map(game => game.year))
  ).sort((a, b) => b - a);

  const seasonRecords = seasons.map(year => {
    const seasonGames = ownerGames.filter(game => game.year === year);

    const record = calculateOwnerRecords(seasonGames)
      .find(row => row.owner === ownerName);

    return {
      year,
      wins: record?.wins ?? 0,
      losses: record?.losses ?? 0,
      ties: record?.ties ?? 0,
      winPct: record?.winPct ?? 0,
      pointsFor: record?.pointsFor ?? 0,
      pointsAgainst: record?.pointsAgainst ?? 0,
      gamesPlayed: record?.gamesPlayed ?? 0
    };
  });

  const total = calculateOwnerRecords(ownerGames)
    .find(row => row.owner === ownerName);

  return {
    seasons: seasonRecords,
    total: {
      wins: total?.wins ?? 0,
      losses: total?.losses ?? 0,
      ties: total?.ties ?? 0,
      winPct: total?.winPct ?? 0,
      pointsFor: total?.pointsFor ?? 0,
      pointsAgainst: total?.pointsAgainst ?? 0,
      gamesPlayed: total?.gamesPlayed ?? 0
    }
  };
}

export function getOwnerQuickFacts(games, ownerName) {
  const ownerGames = getGamesForOwner(games, ownerName);
  const seasons = Array.from(new Set(ownerGames.map(game => game.year)))
    .sort((a, b) => a - b);

  const playoffGames = ownerGames.filter(game => game.gameType === "P");

  const playoffSeasons = Array.from(
    new Set(playoffGames.map(game => game.year))
  );

  const championshipGames = ownerGames.filter(
    game => game.gameType === "P" && game.finalSeeding === 1
  );

  const toiletBowlGames = ownerGames.filter(game => {
    if (game.gameType !== "C") return false;

    const seasonFinishers = getSeasonFinishers(games, game.year);

    return (
      Number(game.finalSeeding) === Number(seasonFinishers.toiletBowlSeeding) &&
      (game.team1 === ownerName || game.team2 === ownerName)
    );
  });

const lastPlaces = calculateLastPlaceFinishes(games);
const lastPlaceFinishes = lastPlaces[ownerName] ?? 0;

  const regularSeasonByYear = seasons.map(year => {
    const seasonGames = ownerGames.filter(
      game => game.year === year && game.gameType === "R"
    );

    const record = calculateOwnerRecords(seasonGames)
      .find(row => row.owner === ownerName);

    return {
      year,
      wins: record?.wins ?? 0,
      losses: record?.losses ?? 0,
      ties: record?.ties ?? 0,
      winPct: record?.winPct ?? 0,
      pointsFor: record?.pointsFor ?? 0,
      gamesPlayed: record?.gamesPlayed ?? 0
    };
  });

  const bestRegularSeason = [...regularSeasonByYear]
    .filter(row => row.gamesPlayed > 0)
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    })[0];

  const worstRegularSeason = [...regularSeasonByYear]
    .filter(row => row.gamesPlayed > 0)
    .sort((a, b) => {
      if (a.winPct !== b.winPct) return a.winPct - b.winPct;
      if (a.wins !== b.wins) return a.wins - b.wins;
      return a.pointsFor - b.pointsFor;
    })[0];

  const sweptLeagueSeasons = regularSeasonByYear.filter(
    row => row.gamesPlayed > 0 && row.losses === 0 && row.ties === 0
  );

  const sweptByLeagueSeasons = regularSeasonByYear.filter(
    row => row.gamesPlayed > 0 && row.wins === 0 && row.ties === 0
  );

  const ownerScores = ownerGames.map(game => {
    const isTeam1 = game.team1 === ownerName;

    return {
      year: game.year,
      week: game.week,
      score: isTeam1 ? game.team1Score : game.team2Score,
      opponent: isTeam1 ? game.team2 : game.team1,
      opponentScore: isTeam1 ? game.team2Score : game.team1Score,
      gameType: game.gameType
    };
  });

  const highestScoringWeek = [...ownerScores]
    .sort((a, b) => b.score - a.score)[0];

  const lowestScoringWeek = [...ownerScores]
    .sort((a, b) => a.score - b.score)[0];

  const sortedOwnerGames = [...ownerGames].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.week !== b.week) return a.week - b.week;
    return a.gameId - b.gameId;
  });

  function getResult(game) {
    const isTeam1 = game.team1 === ownerName;
    const ownerScore = isTeam1 ? game.team1Score : game.team2Score;
    const opponentScore = isTeam1 ? game.team2Score : game.team1Score;

    if (ownerScore > opponentScore) return "W";
    if (ownerScore < opponentScore) return "L";
    return "T";
  }

  function getLongestStreak(targetResult) {
    let current = 0;
    let longest = 0;
    let currentStart = null;
    let longestStart = null;
    let longestEnd = null;

    for (const game of sortedOwnerGames) {
      const result = getResult(game);

      if (result === targetResult) {
        if (current === 0) {
          currentStart = { year: game.year, week: game.week };
        }

        current++;

        if (current > longest) {
          longest = current;
          longestStart = currentStart;
          longestEnd = { year: game.year, week: game.week };
        }
      } else {
        current = 0;
        currentStart = null;
      }
    }

    return {
      games: longest,
      start: longestStart,
      end: longestEnd
    };
  }

  function getFinalFinishForYear(year) {
    const seasonFinishers = getSeasonFinishers(games, year);

    if (seasonFinishers.champion === ownerName) return 1;
    if (seasonFinishers.runnerUp === ownerName) return 2;

    const placementGames = getPlayoffGamesForSeason(games, year)
      .filter(game => Number(game.finalSeeding) > 0)
      .filter(game => game.team1 === ownerName || game.team2 === ownerName);

    if (placementGames.length === 0) return null;

    const finalGame = placementGames
      .sort((a, b) => Number(a.finalSeeding) - Number(b.finalSeeding))[0];

    const isTeam1 = finalGame.team1 === ownerName;
    const ownerScore = isTeam1 ? finalGame.team1Score : finalGame.team2Score;
    const opponentScore = isTeam1 ? finalGame.team2Score : finalGame.team1Score;

    return ownerScore > opponentScore
      ? Number(finalGame.finalSeeding)
      : Number(finalGame.finalSeeding) + 1;
  }

  const finishes = seasons
    .map(year => ({
      year,
      finish: getFinalFinishForYear(year)
    }))
    .filter(row => row.finish !== null);

  const bestFinish = finishes
    .sort((a, b) => a.finish - b.finish)[0];

  return {
    seasonsPlayed: seasons.length,
    bestFinish,

    postseasonAppearances: playoffSeasons.length,
    championshipAppearances: championshipGames.length,

    toiletBowlAppearances: toiletBowlGames.length,
lastPlaceFinishes,

    sweptByLeague: sweptByLeagueSeasons,
    sweptLeague: sweptLeagueSeasons,

    bestRegularSeason: bestRegularSeason ?? {
      year: null,
      wins: 0,
      losses: 0,
      ties: 0
    },

    worstRegularSeason: worstRegularSeason ?? {
      year: null,
      wins: 0,
      losses: 0,
      ties: 0
    },

    highestScoringWeek,
    lowestScoringWeek,

    longestWinningStreak: getLongestStreak("W"),
    longestLosingStreak: getLongestStreak("L")
  };
}

export function getHeadToHeadStats(games, ownerA, ownerB) {
  const matchups = games
    .filter(game =>
      (game.team1 === ownerA && game.team2 === ownerB) ||
      (game.team1 === ownerB && game.team2 === ownerA)
    )
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.week - a.week;
    });

  const stats = {
    ownerA,
    ownerB,
    gamesPlayed: matchups.length,
    ownerAWins: 0,
    ownerBWins: 0,
    ties: 0,
    ownerAPoints: 0,
    ownerBPoints: 0,
    regular: { ownerAWins: 0, ownerBWins: 0, ties: 0, gamesPlayed: 0 },
    playoffs: { ownerAWins: 0, ownerBWins: 0, ties: 0, gamesPlayed: 0 },
    consolation: { ownerAWins: 0, ownerBWins: 0, ties: 0, gamesPlayed: 0 },
    championshipMeetings: [],
    biggestOwnerAWin: null,
    biggestOwnerBWin: null,
    closestGame: null,
    recentGames: []
  };

  for (const game of matchups) {
    const ownerAIsTeam1 = game.team1 === ownerA;

    const ownerAScore = ownerAIsTeam1 ? game.team1Score : game.team2Score;
    const ownerBScore = ownerAIsTeam1 ? game.team2Score : game.team1Score;

    stats.ownerAPoints += ownerAScore;
    stats.ownerBPoints += ownerBScore;

    const margin = Math.abs(ownerAScore - ownerBScore);

    const gameSummary = {
      year: game.year,
      week: game.week,
      gameType: game.gameType,
      finalSeeding: game.finalSeeding,
      ownerAScore,
      ownerBScore,
      margin,
      winner:
        ownerAScore > ownerBScore
          ? ownerA
          : ownerBScore > ownerAScore
            ? ownerB
            : "Tie"
    };

    if (game.gameType === "P" && game.finalSeeding === 1) {
      stats.championshipMeetings.push(gameSummary);
    }

    if (ownerAScore > ownerBScore) {
      stats.ownerAWins++;

      if (!stats.biggestOwnerAWin || margin > stats.biggestOwnerAWin.margin) {
        stats.biggestOwnerAWin = gameSummary;
      }
    } else if (ownerBScore > ownerAScore) {
      stats.ownerBWins++;

      if (!stats.biggestOwnerBWin || margin > stats.biggestOwnerBWin.margin) {
        stats.biggestOwnerBWin = gameSummary;
      }
    } else {
      stats.ties++;
    }

    if (!stats.closestGame || margin < stats.closestGame.margin) {
      stats.closestGame = gameSummary;
    }

    const bucket =
      game.gameType === "R"
        ? stats.regular
        : game.gameType === "P"
          ? stats.playoffs
          : game.gameType === "C"
            ? stats.consolation
            : null;

    if (bucket) {
      bucket.gamesPlayed++;

      if (ownerAScore > ownerBScore) {
        bucket.ownerAWins++;
      } else if (ownerBScore > ownerAScore) {
        bucket.ownerBWins++;
      } else {
        bucket.ties++;
      }
    }

    stats.recentGames.push(gameSummary);
  }

  stats.ownerAAverage =
    stats.gamesPlayed > 0 ? stats.ownerAPoints / stats.gamesPlayed : 0;

  stats.ownerBAverage =
    stats.gamesPlayed > 0 ? stats.ownerBPoints / stats.gamesPlayed : 0;

  stats.ownerAChampionshipWins =
    stats.championshipMeetings.filter(game => game.winner === ownerA).length;

  stats.ownerBChampionshipWins =
    stats.championshipMeetings.filter(game => game.winner === ownerB).length;

  stats.recentGames = stats.recentGames.slice(0, 15);

  return stats;
}

export function getHallOfFameStats(games) {
  const allRecords = calculateOwnerRecords(games);

  const regularRecords = calculateOwnerRecords(
    games.filter(game => game.gameType === "R")
  );

  const playoffRecords = calculateOwnerRecords(
    games.filter(game => game.gameType === "P")
  );

  const championships = calculateChampionships(games);
const lastPlaces = calculateLastPlaceFinishes(games);

  const championshipLeaders = allRecords
    .map(owner => ({
      owner: owner.owner,
      value: championships[owner.owner]?.championships ?? 0
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const runnerUpLeaders = allRecords
    .map(owner => ({
      owner: owner.owner,
      value: championships[owner.owner]?.runnerUps ?? 0
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);

const lastPlaceLeaders = allRecords
  .map(owner => ({
    owner: owner.owner,
    value: lastPlaces[owner.owner] ?? 0
  }))
  .filter(row => row.value > 0)
  .sort((a, b) => b.value - a.value);

  const winPctLeaders = regularRecords
    .filter(owner => owner.gamesPlayed >= 50)
    .map(owner => ({
      owner: owner.owner,
      value: owner.winPct,
      gamesPlayed: owner.gamesPlayed
    }))
    .sort((a, b) => b.value - a.value);

  const pointsForLeaders = regularRecords
    .map(owner => ({
      owner: owner.owner,
      value: owner.pointsFor
    }))
    .sort((a, b) => b.value - a.value);

  const winsLeaders = regularRecords
    .map(owner => ({
      owner: owner.owner,
      value: owner.wins
    }))
    .sort((a, b) => b.value - a.value);

  const playoffWinsLeaders = playoffRecords
    .map(owner => ({
      owner: owner.owner,
      value: owner.wins
    }))
    .sort((a, b) => b.value - a.value);

  const bestSingleSeasons = [];

  for (const owner of regularRecords) {
    const ownerSeasonRecords = getOwnerSeasonRecords(games, owner.owner, "R");

    for (const season of ownerSeasonRecords.seasons) {
      bestSingleSeasons.push({
        owner: owner.owner,
        year: season.year,
        wins: season.wins,
        losses: season.losses,
        ties: season.ties,
        winPct: season.winPct,
        pointsFor: season.pointsFor,
        pointsAgainst: season.pointsAgainst,
        gamesPlayed: season.gamesPlayed
      });
    }
  }

  bestSingleSeasons.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  return {
    championshipLeaders,
    runnerUpLeaders,
    winPctLeaders,
    pointsForLeaders,
    winsLeaders,
    playoffWinsLeaders,
    lastPlaceLeaders,
    bestSingleSeasons: bestSingleSeasons.slice(0, 3)
  };
}

export function getSurvivorResults(games) {
  const seasons = getSeasonList(games);
  const results = [];

  for (const year of seasons) {
    const seasonGames = getGamesForSeason(games, year)
      .filter(game => game.gameType === "R");

    const weeklyScores = {};

    for (const game of seasonGames) {
      if (!weeklyScores[game.week]) {
        weeklyScores[game.week] = [];
      }

      weeklyScores[game.week].push({
        owner: game.team1,
        score: game.team1Score,
        opponent: game.team2
      });

      weeklyScores[game.week].push({
        owner: game.team2,
        score: game.team2Score,
        opponent: game.team1
      });
    }

    const allOwners = Array.from(
      new Set(seasonGames.flatMap(game => [game.team1, game.team2]))
    );

    const alive = new Set(allOwners);
    const eliminations = [];

    const weeks = Object.keys(weeklyScores)
      .map(Number)
      .sort((a, b) => a - b);

    for (const week of weeks) {
      if (alive.size <= 1) break;

      const aliveScores = weeklyScores[week]
        .filter(row => alive.has(row.owner))
        .sort((a, b) => a.score - b.score);

      if (aliveScores.length === 0) continue;

      const lowestScore = aliveScores[0].score;

      const eliminatedOwners = aliveScores.filter(
        row => row.score === lowestScore
      );

      for (const eliminated of eliminatedOwners) {
        alive.delete(eliminated.owner);

        eliminations.push({
          week,
          owner: eliminated.owner,
          score: eliminated.score,
          opponent: eliminated.opponent,
          remainingAfterElimination: alive.size
        });
      }
    }

    const remainingTeams = Array.from(alive);

    results.push({
      year,
      startingOwners: allOwners.length,
      complete: remainingTeams.length <= 1,
      survivor: remainingTeams.length === 1 ? remainingTeams[0] : null,
      noSurvivor: remainingTeams.length === 0,
      remainingTeams,
      eliminations
    });
  }

  return results;
}

export function getPowerRankings(games, owners = []) {
  const allRecords = calculateOwnerRecords(games);
  const regularRecords = calculateOwnerRecords(
    games.filter(game => game.gameType === "R")
  );
  const playoffRecords = calculateOwnerRecords(
    games.filter(game => game.gameType === "P")
  );

const championships = calculateChampionships(games);
const lastPlaces = calculateLastPlaceFinishes(games);

  const activeOwners = new Set(
    owners
      .filter(owner => owner.status === "ACTIVE")
      .map(owner => owner.owner)
  );

  const ownerNames = Array.from(
    new Set(games.flatMap(game => [game.team1, game.team2]))
  ).sort();

  const rankings = ownerNames.map(ownerName => {
    const all = allRecords.find(row => row.owner === ownerName);
    const regular = regularRecords.find(row => row.owner === ownerName);
    const playoffs = playoffRecords.find(row => row.owner === ownerName);

    const titles = championships[ownerName]?.championships ?? 0;
    const runnerUps = championships[ownerName]?.runnerUps ?? 0;
    const lastPlaceFinishes = lastPlaces[ownerName] ?? 0;

    const regularWins = regular?.wins ?? 0;
    const playoffWins = playoffs?.wins ?? 0;
    const winPct = regular?.winPct ?? 0;
    const gamesPlayed = regular?.gamesPlayed ?? 0;
    const pointsPerGame =
      gamesPlayed > 0 ? (regular?.pointsFor ?? 0) / gamesPlayed : 0;

    const score =
      titles * 25 +
      runnerUps * 10 +
      regularWins * 2 +
      playoffWins * 4 +
      winPct * 100 +
      pointsPerGame * 0.25 -
      - lastPlaceFinishes * 15;

    return {
      owner: ownerName,
      active: activeOwners.has(ownerName),
      score,
      championships: titles,
      runnerUps,
      lastPlaceFinishes,
      regularWins,
      playoffWins,
      winPct,
      gamesPlayed,
      pointsPerGame
    };
  });

  return rankings
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
}

