async function aggregateGameDatas(Match) {
  // 연간 집계
  const yearAgg = await Match.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          map: "$map",
          round: "$round"
        }
      }
    },
    {
      $group: {
        _id: { year: "$_id.year", map: "$_id.map" },
        roundCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.year",
        totalGames: { $sum: "$roundCount" },
        map: {
          $push: { k: "$_id.map", v: "$roundCount" }
        }
      }
    },
    {
      $project: {
        totalGames: 1,
        map: { $arrayToObject: "$map" },
        minRequiredRound: { $ceil: { $multiply: ["$totalGames", 0.25] } }
      }
    }
  ]);

  // 월간 집계
  const monthAgg = await Match.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          map: "$map",
          round: "$round"
        }
      }
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month", map: "$_id.map" },
        roundCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month" },
        totalGames: { $sum: "$roundCount" },
        map: {
          $push: { k: "$_id.map", v: "$roundCount" }
        }
      }
    },
    {
      $project: {
        totalGames: 1,
        map: { $arrayToObject: "$map" },
        minRequiredRound: {
          $cond: [
            { $gt: ["$totalGames", 100] },
            30,
            24
          ]
        }
      }
    }
  ]);

  // Map 변환
  const yearMap = {};
  for (const y of yearAgg) {
    yearMap[String(y._id)] = {
      totalGames: y.totalGames,
      map: y.map,
      minRequiredRound: y.minRequiredRound
    };
  }

  const monthMap = {};
  for (const m of monthAgg) {
    const key = `${m._id.year}-${String(m._id.month).padStart(2, '0')}`;
    monthMap[key] = {
      totalGames: m.totalGames,
      map: m.map,
      minRequiredRound: m.minRequiredRound
    };
  }

  return {
    byYear: yearMap,
    byMonth: monthMap
  };
}

module.exports = { aggregateGameDatas };