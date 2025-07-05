async function aggregateGameDatas(Match, date) {
  const [year, month, day] = date.split('-').map(Number);

  // 해당 날짜의 Match만 필터링
  const dayAgg = await Match.aggregate([
    {
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $year: "$date" }, year] },
            { $eq: [{ $month: "$date" }, month] },
            { $eq: [{ $dayOfMonth: "$date" }, day] }
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
          map: "$map",
          round: "$round"
        }
      }
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month", day: "$_id.day", map: "$_id.map" },
        roundCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month", day: "$_id.day" },
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
        minRequiredRound: 1
      }
    }
  ]);

  // Map 변환
  const dayMap = {};
  for (const m of dayAgg) {
    const key = `${m._id.year}-${String(m._id.month).padStart(2, '0')}-${String(m._id.day).padStart(2, '0')}`;
    dayMap[key] = {
      totalGames: m.totalGames,
      map: m.map,
      minRequiredRound: m.minRequiredRound
    };
  }

  return {
    byDay: dayMap
  };
}

module.exports = { aggregateGameDatas };