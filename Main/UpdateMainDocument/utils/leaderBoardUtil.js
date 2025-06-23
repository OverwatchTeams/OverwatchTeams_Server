// LeaderBoard 집계 함수
async function aggregateLeaderBoardDatas(Match, gameDatas, Player) {
  // 집계
  const agg = await Match.aggregate([
    {
      $project: {
        player: 1,
        year: { $year: "$date" },
        month: { $dateToString: { format: "%Y-%m", date: "$date" } },
        map: 1,
        role: 1,
        win: { $cond: [{ $eq: ["$winlose", "승"] }, 1, 0] },
        loss: { $cond: [{ $eq: ["$winlose", "패"] }, 1, 0] },
        draw: { $cond: [{ $eq: ["$winlose", "무"] }, 1, 0] }
      }
    }
  ]);

  const allPlayers = await Player.find({});
  const playerMap = new Map(allPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));

  // 연도별 리더보드
  const byYear = {};
  // 월별 리더보드
  const byMonth = {};

  for (const row of agg) {
    // 연도별
    const year = String(row.year);
    const player = String(playerMap.get(row.player)?.player || row.player);
    const map = row.map;
    const role = row.role;
    const month = String(row.month);

    // 연도별 최소경기수
    const minRequiredRoundYear = gameDatas.byYear?.[year]?.minRequiredRound || 0;
    // 월별 최소경기수
    const minRequiredRoundMonth = gameDatas.byMonth?.[month]?.minRequiredRound || 0;

    // 연도별 초기화
    if (!byYear[year]) {
      byYear[year] = {
        winRate: { total: {}, role: { D: {}, T: {}, H: {} }, map: {}, roleMap: { D: {}, T: {}, H: {} } },
        attendance: { total: {}, map: {}, minRequiredRound: minRequiredRoundYear }
      };
    }
    // 월별 초기화
    if (!byMonth[month]) {
      byMonth[month] = {
        winRate: { total: {}, role: { D: {}, T: {}, H: {} }, map: {}, roleMap: { D: {}, T: {}, H: {} } },
        attendance: { total: {}, map: {}, minRequiredRound: minRequiredRoundMonth }
      };
    }

    // 연도별 누적
    const targets = [byYear[year], byMonth[month]];
    for (const target of targets) {
      // total
      if (!target.winRate.total[player]) {
        target.winRate.total[player] = { wins: 0, losses: 0, draws: 0, winRate: 0, ranking: 0, isMinRequired: false };
      }
      target.winRate.total[player].wins += row.win;
      target.winRate.total[player].losses += row.loss;
      target.winRate.total[player].draws += row.draw;

      // role
      if (!target.winRate.role[role][player]) {
        target.winRate.role[role][player] = { wins: 0, losses: 0, draws: 0, winRate: 0 };
      }
      target.winRate.role[role][player].wins += row.win;
      target.winRate.role[role][player].losses += row.loss;
      target.winRate.role[role][player].draws += row.draw;

      // map
      if (!target.winRate.map[map]) target.winRate.map[map] = {};
      if (!target.winRate.map[map][player]) {
        target.winRate.map[map][player] = { wins: 0, losses: 0, draws: 0, winRate: 0 };
      }
      target.winRate.map[map][player].wins += row.win;
      target.winRate.map[map][player].losses += row.loss;
      target.winRate.map[map][player].draws += row.draw;

      // roleMap
      if (!target.winRate.roleMap[role][map]) target.winRate.roleMap[role][map] = {};
      if (!target.winRate.roleMap[role][map][player]) {
        target.winRate.roleMap[role][map][player] = { wins: 0, losses: 0, draws: 0, winRate: 0 };
      }
      target.winRate.roleMap[role][map][player].wins += row.win;
      target.winRate.roleMap[role][map][player].losses += row.loss;
      target.winRate.roleMap[role][map][player].draws += row.draw;

      // attendance
      if (!target.attendance.total[player]) {
        target.attendance.total[player] = { playedGames: 0, totalGames: 0, ranking: 0, isMinRequired: false };
      }
      target.attendance.total[player].playedGames += 1;

      // attendance map
      if (!target.attendance.map[map]) target.attendance.map[map] = {};
      if (!target.attendance.map[map][player]) {
        target.attendance.map[map][player] = { playedGames: 0 };
      }
      target.attendance.map[map][player].playedGames += 1;
    }
  }

  // 연도별/월별 승률, 랭킹, Map 변환
  function finalize(target, key, gameDatasKey) {
    for (const k in target) {
      const totalGames = gameDatas[gameDatasKey]?.[k]?.totalGames || 0;
      target[k].attendance.totalGames = totalGames;

      // total 승률 및 최소경기수
      const totalArr = Object.entries(target[k].winRate.total);
      totalArr.forEach(([player, data]) => {
        const games = data.wins + data.losses + data.draws;
        data.winRate = games > 0 ? ((data.wins + 0.5 * data.draws) / games) * 100 : 0;
        data.isMinRequired = games >= target[k].attendance.minRequiredRound;
        target[k].winRate.total[player] = data;
      });

      // 랭킹 계산
      const ranked = totalArr
        .filter(([_, d]) => d.isMinRequired)
        .sort((a, b) => b[1].winRate - a[1].winRate);
      ranked.forEach(([player, _], idx) => {
        target[k].winRate.total[player].ranking = idx + 1;
      });

      // Map 변환 (랭킹순으로)
      target[k].winRate.total = new Map(
        ranked.concat(
          totalArr.filter(([player]) => !ranked.find(([p]) => p === player))
        )
      );

      // role/map/roleMap 승률
      for (const role of ["D", "T", "H"]) {
        for (const player in target[k].winRate.role[role]) {
          const d = target[k].winRate.role[role][player];
          const games = d.wins + d.losses + d.draws;
          d.winRate = games > 0 ? ((d.wins + 0.5 * d.draws) / games) * 100 : 0;
        }
        for (const map in target[k].winRate.roleMap[role]) {
          for (const player in target[k].winRate.roleMap[role][map]) {
            const d = target[k].winRate.roleMap[role][map][player];
            const games = d.wins + d.losses + d.draws;
            d.winRate = games > 0 ? ((d.wins + 0.5 * d.draws) / games) * 100 : 0;
          }
        }
      }
      for (const map in target[k].winRate.map) {
        for (const player in target[k].winRate.map[map]) {
          const d = target[k].winRate.map[map][player];
          const games = d.wins + d.losses + d.draws;
          d.winRate = games > 0 ? ((d.wins + 0.5 * d.draws) / games) * 100 : 0;
        }
      }

      // Map 변환 (중요!)
      target[k].winRate.role.D = new Map(Object.entries(target[k].winRate.role.D));
      target[k].winRate.role.T = new Map(Object.entries(target[k].winRate.role.T));
      target[k].winRate.role.H = new Map(Object.entries(target[k].winRate.role.H));
      // attendance 랭킹, totalGames, isMinRequired 계산
      const attArr = Array.from(Object.entries(target[k].attendance.total));
      attArr.forEach(([player, data]) => {
        data.totalGames = target[k].attendance.totalGames || 0;
        data.isMinRequired = data.playedGames >= target[k].attendance.minRequiredRound;
        target[k].attendance.total[player] = data;
      });
      // attendance 랭킹 부여 (출석률 높은 순)
      const attRanked = attArr
        .filter(([_, d]) => d.isMinRequired)
        .sort((a, b) => b[1].playedGames - a[1].playedGames);
      attRanked.forEach(([player, _], idx) => {
        target[k].attendance.total[player].ranking = idx + 1;
      });
      // attendance.total Map을 랭킹순으로 변환
      target[k].attendance.total = new Map(
        attRanked.concat(
          attArr.filter(([player]) => !attRanked.find(([p]) => p === player))
        )
      );
    }
  }

  finalize(byYear, "byYear", "byYear");
  finalize(byMonth, "byMonth", "byMonth");

  // Map 변환
  return {
    byYear: new Map(Object.entries(byYear)),
    byMonth: new Map(Object.entries(byMonth))
  };
}

module.exports = { aggregateLeaderBoardDatas };