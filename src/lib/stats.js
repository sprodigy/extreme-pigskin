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
      finalSeeding: game.finalSeeding
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
      const topScore = scores
        .sort((a, b) => b.score - a.score)[0];

      return {
        week: Number(week),
        ...topScore
      };
    })
    .sort((a, b) => a.week - b.week);
}

export function calculateToiletBowls(games) {
  const toiletBowls = {};

  const seasons = getSeasonList(games);

  for (const year of seasons) {
    const playoffGames = getPlayoffGamesForSeason(games, year);

    const consolationPlacementGames = playoffGames
      .filter(game => game.gameType === "C")
      .filter(game => Number(game.finalSeeding) > 0);

    const toiletBowlGame = consolationPlacementGames
      .sort((a, b) => Number(b.finalSeeding) - Number(a.finalSeeding))[0];

    if (!toiletBowlGame) continue;

    const team1Won = toiletBowlGame.team1Score > toiletBowlGame.team2Score;

    const winner = team1Won ? toiletBowlGame.team1 : toiletBowlGame.team2;

    if (!toiletBowls[winner]) {
      toiletBowls[winner] = 0;
    }

    toiletBowls[winner]++;
  }

  return toiletBowls;
}

export function getOwnerQuickFacts(games, ownerName) {
  const ownerGames = getGamesForOwner(games, ownerName);
  const seasons = Array.from(new Set(ownerGames.map(game => game.year))).sort((a, b) => a - b);

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
      game.finalSeeding === seasonFinishers.toiletBowlSeeding &&
      (game.team1 === ownerName || game.team2 === ownerName)
    );
  });

  const toiletBowlsWon = calculateToiletBowls(games)[ownerName] ?? 0;

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

  const ownerScores = ownerGames.flatMap(game => {
    const isTeam1 = game.team1 === ownerName;

    return [{
      year: game.year,
      week: game.week,
      score: isTeam1 ? game.team1Score : game.team2Score,
      opponent: isTeam1 ? game.team2 : game.team1,
      opponentScore: isTeam1 ? game.team2Score : game.team1Score,
      gameType: game.gameType
    }];
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

    postseasonAppearances: playoffGames.length,
    championshipAppearances: championshipGames.length,

    toiletBowlAppearances: toiletBowlGames.length,
    toiletBowlsWon,

    sweptByLeague: sweptByLeagueSeasons,
    sweptLeague: sweptLeagueSeasons,

    bestRegularSeason,
    worstRegularSeason,

    highestScoringWeek,
    lowestScoringWeek,

    longestWinningStreak: getLongestStreak("W"),
    longestLosingStreak: getLongestStreak("L")
  };
}

