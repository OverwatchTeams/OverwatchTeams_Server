async function aggregateWinRate(Match, Player) {
  try {
    // 연/월별 전체, 맵별, 역할별 경기수, 승수 집계
    const agg = await Match.aggregate([
      {
        $project: {
          player: 1,
          year: { $year: "$date" },
          month: { $dateToString: { format: "%Y-%m", date: "$date" } },
          map: 1,
          role: 1,
          win: { $cond: [{ $eq: ["$winlose", "승"] }, 1, 0] },
          draw: { $cond: [{ $eq: ["$winlose", "무"] }, 1, 0] }
        }
      },
      {
        $group: {
          _id: {
            player: "$player",
            year: "$year",
            month: "$month",
            map: "$map",
            role: "$role"
          },
          totalGamesYear: { $sum: 1 },
          totalWinsYear: { $sum: "$win" },
          totalDrawsYear: { $sum: "$draw" },
          totalGamesMonth: { $sum: 1 },
          totalWinsMonth: { $sum: "$win" },
          totalDrawsMonth: { $sum: "$draw" }
        }
      }
    ]);

    // 클랜원 불러오기
    // subNames도 반영
    const clanPlayers = await Player.find({ isClanMember: true });
    const playerMap = new Map(clanPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));

    // 연/월별 데이터 정리
    const playerYear = {};
    const playerMonth = {};

    for (const row of agg) {
      const pid = row._id.player;
      const player = playerMap.get(pid);

      if (!player) continue;

      const year = String(row._id.year);
      const month = row._id.month;
      const map = row._id.map;
      const role = row._id.role;

      // 연간
      if (!playerYear[player.player]) playerYear[player.player] = {};
      if (!playerYear[player.player][year]) playerYear[player.player][year] = {
        total: { playedGames: 0, wins: 0, draws: 0 },
        map: {},
        role: { D: { playedGames: 0, wins: 0, draws: 0 }, T: { playedGames: 0, wins: 0, draws: 0 }, H: { playedGames: 0, wins: 0, draws: 0 } },
        roleMap: {}
      };
      // 전체
      playerYear[player.player][year].total.playedGames += row.totalGamesYear;
      playerYear[player.player][year].total.wins += row.totalWinsYear;
      playerYear[player.player][year].total.draws += row.totalDrawsYear;
      // 맵별
      if (map) {
        if (!playerYear[player.player][year].map[map]) playerYear[player.player][year].map[map] = { playedGames: 0, wins: 0, draws: 0 };
        playerYear[player.player][year].map[map].playedGames += row.totalGamesYear;
        playerYear[player.player][year].map[map].wins += row.totalWinsYear;
        playerYear[player.player][year].map[map].draws += row.totalDrawsYear;
      }
      // 역할별
      if (role && playerYear[player.player][year].role[role]) {
        playerYear[player.player][year].role[role].playedGames += row.totalGamesYear;
        playerYear[player.player][year].role[role].wins += row.totalWinsYear;
        playerYear[player.player][year].role[role].draws += row.totalDrawsYear;
      }

      // 역할+맵별
      if (role && map) {
        if (!playerYear[player.player][year].roleMap[role]) playerYear[player.player][year].roleMap[role] = {};
        if (!playerYear[player.player][year].roleMap[role][map]) playerYear[player.player][year].roleMap[role][map] = { playedGames: 0, wins: 0, draws: 0 };
        playerYear[player.player][year].roleMap[role][map].playedGames += row.totalGamesYear;
        playerYear[player.player][year].roleMap[role][map].wins += row.totalWinsYear;
        playerYear[player.player][year].roleMap[role][map].draws += row.totalDrawsYear;
      }

      // 월간
      if (!playerMonth[player.player]) playerMonth[player.player] = {};
      if (!playerMonth[player.player][month]) playerMonth[player.player][month] = {
        total: { playedGames: 0, wins: 0, draws: 0 },
        map: {},
        role: { D: { playedGames: 0, wins: 0, draws: 0 }, T: { playedGames: 0, wins: 0, draws: 0 }, H: { playedGames: 0, wins: 0, draws: 0 } },
        roleMap: {}
      };
      // 전체
      playerMonth[player.player][month].total.playedGames += row.totalGamesMonth;
      playerMonth[player.player][month].total.wins += row.totalWinsMonth;
      playerMonth[player.player][month].total.draws += row.totalDrawsMonth;
      // 맵별
      if (map) {
        if (!playerMonth[player.player][month].map[map]) playerMonth[player.player][month].map[map] = { playedGames: 0, wins: 0, draws: 0 };
        playerMonth[player.player][month].map[map].playedGames += row.totalGamesMonth;
        playerMonth[player.player][month].map[map].wins += row.totalWinsMonth;
        playerMonth[player.player][month].map[map].draws += row.totalDrawsMonth;
      }
      // 역할별
      if (role && playerMonth[player.player][month].role[role]) {
        playerMonth[player.player][month].role[role].playedGames += row.totalGamesMonth;
        playerMonth[player.player][month].role[role].wins += row.totalWinsMonth;
        playerMonth[player.player][month].role[role].draws += row.totalDrawsMonth;
      }

      // 역할+맵별
      if (role && map) {
        if (!playerMonth[player.player][month].roleMap[role]) playerMonth[player.player][month].roleMap[role] = {};
        if (!playerMonth[player.player][month].roleMap[role][map]) playerMonth[player.player][month].roleMap[role][map] = { playedGames: 0, wins: 0, draws: 0 };
        playerMonth[player.player][month].roleMap[role][map].playedGames += row.totalGamesMonth;
        playerMonth[player.player][month].roleMap[role][map].wins += row.totalWinsMonth;
        playerMonth[player.player][month].roleMap[role][map].draws += row.totalDrawsMonth;
      }
    }

    // Player별로 winRates.byYear, byMonth 갱신
    for (const pid of Object.keys(playerYear)) {
      const player = playerMap.get(pid);
      if (!player) continue;

      const byYear = {};
      for (const y of Object.keys(playerYear[player.player])) {
        const d = playerYear[player.player][y];
        d.total.requiredGames = Math.ceil(d.total.playedGames * 0.25);

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const m = d.map[mapName];
          mapObj[mapName] = {
            playedGames: m.playedGames,
            requiredGames: 0,
            wins: m.wins,
            draws: m.draws,
            rate: m.playedGames > 0 ? (m.wins + m.draws * 0.5) / m.playedGames : 0
          };
        }
        // 역할별
        const roleObj = {};
        for (const roleName of Object.keys(d.role)) {
          const r = d.role[roleName];
          roleObj[roleName] = {
            playedGames: r.playedGames,
            requiredGames: 0,
            wins: r.wins,
            draws: r.draws,
            rate: r.playedGames > 0 ? (r.wins + r.draws * 0.5) / r.playedGames : 0
          };
        }
        // 역할+맵별
        const roleMapObj = {};
        for (const roleName of Object.keys(d.roleMap)) {
          roleMapObj[roleName] = {};
          for (const mapName of Object.keys(d.roleMap[roleName])) {
            const rm = d.roleMap[roleName][mapName];
            roleMapObj[roleName][mapName] = {
              playedGames: rm.playedGames,
              requiredGames: 0,
              wins: rm.wins,
              draws: rm.draws,
              rate: rm.playedGames > 0 ? (rm.wins + rm.draws * 0.5) / rm.playedGames : 0
            };
          }
        }

        byYear[y] = {
          total: {
            playedGames: d.total.playedGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            draws: d.total.draws,
            rate: d.total.playedGames > 0 ? (d.total.wins + d.total.draws * 0.5) / d.total.playedGames : 0
          },
          map: mapObj,
          role: roleObj,
          roleMap: roleMapObj
        };
      }
      const byMonth = {};
      for (const m of Object.keys(playerMonth[player.player])) {
        const d = playerMonth[player.player][m];
        d.total.requiredGames = d.total.playedGames > 100 ? 30 : 25;

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const mm = d.map[mapName];
          mapObj[mapName] = {
            playedGames: mm.playedGames,
            requiredGames: 0,
            wins: mm.wins,
            draws: mm.draws,
            rate: mm.playedGames > 0 ? (mm.wins + mm.draws * 0.5) / mm.playedGames : 0
          };
        }
        // 역할별
        const roleObj = {};
        for (const roleName of Object.keys(d.role)) {
          const rr = d.role[roleName];
          roleObj[roleName] = {
            playedGames: rr.playedGames,
            requiredGames: 0,
            wins: rr.wins,
            draws: rr.draws,
            rate: rr.playedGames > 0 ? (rr.wins + rr.draws * 0.5) / rr.playedGames : 0
          };
        }
        // 역할+맵별
        const roleMapObj = {};
        for (const roleName of Object.keys(d.roleMap)) {
          roleMapObj[roleName] = {};
          for (const mapName of Object.keys(d.roleMap[roleName])) {
            const rm = d.roleMap[roleName][mapName];
            roleMapObj[roleName][mapName] = {
              playedGames: rm.playedGames,
              requiredGames: 0,
              wins: rm.wins,
              draws: rm.draws,
              rate: rm.playedGames > 0 ? (rm.wins + rm.draws * 0.5) / rm.playedGames : 0
            };
          }
        }

        byMonth[m] = {
          total: {
            playedGames: d.total.playedGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            draws: d.total.draws,
            rate: d.total.playedGames > 0 ? (d.total.wins + d.total.draws * 0.5) / d.total.playedGames : 0
          },
          map: mapObj,
          role: roleObj,
          roleMap: roleMapObj
        };
      }

      await Player.findOneAndUpdate(
        { player: player.player },
        {
          $set: {
            "winRates.byYear": byYear,
            "winRates.byMonth": byMonth
          }
        },
        { upsert: false, new: true }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All player winRates updated successfully.' }),
    };

  } catch (error) {
    console.error('Update failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating player winRates.', error }),
    };
  }
}
module.exports = { aggregateWinRate };