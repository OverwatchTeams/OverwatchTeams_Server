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
          draw: { $cond: [{ $eq: ["$winlose", "무"] }, 1, 0] } // Add draw condition
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
          totalDrawsYear: { $sum: "$draw" }, // Aggregate draws
          totalGamesMonth: { $sum: 1 },
          totalWinsMonth: { $sum: "$win" },
          totalDrawsMonth: { $sum: "$draw" } // Aggregate draws
        }
      }
    ]);

    // 연/월별 데이터 정리
    const playerYear = {};
    const playerMonth = {};

    for (const row of agg) {
      const pid = row._id.player;
      const year = String(row._id.year);
      const month = row._id.month;
      const map = row._id.map;
      const role = row._id.role;

      // 연간
      if (!playerYear[pid]) playerYear[pid] = {};
      if (!playerYear[pid][year]) playerYear[pid][year] = {
        total: { playedGames: 0, wins: 0, draws: 0 }, // Add draws
        map: {},
        role: { D: { playedGames: 0, wins: 0, draws: 0 }, T: { playedGames: 0, wins: 0, draws: 0 }, H: { playedGames: 0, wins: 0, draws: 0 } },
        roleMap: {}
      };
      // 전체
      playerYear[pid][year].total.playedGames += row.totalGamesYear;
      playerYear[pid][year].total.wins += row.totalWinsYear;
      playerYear[pid][year].total.draws += row.totalDrawsYear; // Add draws
      // 맵별
      if (map) {
        if (!playerYear[pid][year].map[map]) playerYear[pid][year].map[map] = { playedGames: 0, wins: 0, draws: 0 }; // Add draws
        playerYear[pid][year].map[map].playedGames += row.totalGamesYear;
        playerYear[pid][year].map[map].wins += row.totalWinsYear;
        playerYear[pid][year].map[map].draws += row.totalDrawsYear; // Add draws
      }
      // 역할별
      if (role && playerYear[pid][year].role[role]) {
        playerYear[pid][year].role[role].playedGames += row.totalGamesYear;
        playerYear[pid][year].role[role].wins += row.totalWinsYear;
        playerYear[pid][year].role[role].draws += row.totalDrawsYear; // Add draws
      }

      // 역할+맵별
      if (role && map) {
        if (!playerYear[pid][year].roleMap[role]) playerYear[pid][year].roleMap[role] = {};
        if (!playerYear[pid][year].roleMap[role][map]) playerYear[pid][year].roleMap[role][map] = { playedGames: 0, wins: 0, draws: 0 }; // Add draws
        playerYear[pid][year].roleMap[role][map].playedGames += row.totalGamesYear;
        playerYear[pid][year].roleMap[role][map].wins += row.totalWinsYear;
        playerYear[pid][year].roleMap[role][map].draws += row.totalDrawsYear; // Add draws
      }

      // 월간
      if (!playerMonth[pid]) playerMonth[pid] = {};
      if (!playerMonth[pid][month]) playerMonth[pid][month] = {
        total: { playedGames: 0, wins: 0, draws: 0 }, // Add draws
        map: {},
        role: { D: { playedGames: 0, wins: 0, draws: 0 }, T: { playedGames: 0, wins: 0, draws: 0 }, H: { playedGames: 0, wins: 0, draws: 0 } },
        roleMap: {}
      };
      // 전체
      playerMonth[pid][month].total.playedGames += row.totalGamesMonth;
      playerMonth[pid][month].total.wins += row.totalWinsMonth;
      playerMonth[pid][month].total.draws += row.totalDrawsMonth; // Add draws
      // 맵별
      if (map) {
        if (!playerMonth[pid][month].map[map]) playerMonth[pid][month].map[map] = { playedGames: 0, wins: 0, draws: 0 }; // Add draws
        playerMonth[pid][month].map[map].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].map[map].wins += row.totalWinsMonth;
        playerMonth[pid][month].map[map].draws += row.totalDrawsMonth; // Add draws
      }
      // 역할별
      if (role && playerMonth[pid][month].role[role]) {
        playerMonth[pid][month].role[role].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].role[role].wins += row.totalWinsMonth;
        playerMonth[pid][month].role[role].draws += row.totalDrawsMonth; // Add draws
      }

      // 역할+맵별
      if (role && map) {
        if (!playerMonth[pid][month].roleMap[role]) playerMonth[pid][month].roleMap[role] = {};
        if (!playerMonth[pid][month].roleMap[role][map]) playerMonth[pid][month].roleMap[role][map] = { playedGames: 0, wins: 0, draws: 0 }; // Add draws
        playerMonth[pid][month].roleMap[role][map].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].roleMap[role][map].wins += row.totalWinsMonth;
        playerMonth[pid][month].roleMap[role][map].draws += row.totalDrawsMonth; // Add draws
      }
    }

    // Player별로 winRates.byYear, byMonth 갱신
    for (const pid of Object.keys(playerYear)) {
      const byYear = {};
      for (const y of Object.keys(playerYear[pid])) {
        const d = playerYear[pid][y];
        d.total.requiredGames = Math.ceil(d.total.playedGames * 0.25);

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const m = d.map[mapName];
          mapObj[mapName] = {
            playedGames: m.playedGames,
            requiredGames: 0,
            wins: m.wins,
            draws: m.draws, // Add draws
            rate: m.playedGames > 0 ? (m.wins + m.draws * 0.5) / m.playedGames : 0 // Adjust rate calculation
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
            draws: r.draws, // Add draws
            rate: r.playedGames > 0 ? (r.wins + r.draws * 0.5) / r.playedGames : 0 // Adjust rate calculation
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
              draws: rm.draws, // Add draws
              rate: rm.playedGames > 0 ? (rm.wins + rm.draws * 0.5) / rm.playedGames : 0 // Adjust rate calculation
            };
          }
        }

        byYear[y] = {
          total: {
            playedGames: d.total.playedGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            draws: d.total.draws, // Add draws
            rate: d.total.playedGames > 0 ? (d.total.wins + d.total.draws * 0.5) / d.total.playedGames : 0 // Adjust rate calculation
          },
          map: mapObj,
          role: roleObj,
          roleMap: roleMapObj
        };
      }
      const byMonth = {};
      for (const m of Object.keys(playerMonth[pid])) {
        const d = playerMonth[pid][m];
        d.total.requiredGames = d.total.playedGames > 100 ? 30 : 25;

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const mm = d.map[mapName];
          mapObj[mapName] = {
            playedGames: mm.playedGames,
            requiredGames: 0,
            wins: mm.wins,
            draws: mm.draws, // Add draws
            rate: mm.playedGames > 0 ? (mm.wins + mm.draws * 0.5) / mm.playedGames : 0 // Adjust rate calculation
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
            draws: rr.draws, // Add draws
            rate: rr.playedGames > 0 ? (rr.wins + rr.draws * 0.5) / rr.playedGames : 0 // Adjust rate calculation
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
              draws: rm.draws, // Add draws
              rate: rm.playedGames > 0 ? (rm.wins + rm.draws * 0.5) / rm.playedGames : 0 // Adjust rate calculation
            };
          }
        }

        byMonth[m] = {
          total: {
            playedGames: d.total.playedGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            draws: d.total.draws, // Add draws
            rate: d.total.playedGames > 0 ? (d.total.wins + d.total.draws * 0.5) / d.total.playedGames : 0 // Adjust rate calculation
          },
          map: mapObj,
          role: roleObj,
          roleMap: roleMapObj
        };
      }

      await Player.findOneAndUpdate(
        { player: pid },
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