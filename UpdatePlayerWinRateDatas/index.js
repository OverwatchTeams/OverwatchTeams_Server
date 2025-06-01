const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();
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
          win: { $cond: [{ $eq: ["$winlose", "승"] }, 1, 0] }
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
          totalGamesMonth: { $sum: 1 },
          totalWinsMonth: { $sum: "$win" }
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
        total: { playedGames: 0, totalGames: 0, wins: 0 },
        map: {},
        role: { D: { playedGames: 0, totalGames: 0, wins: 0 }, T: { playedGames: 0, totalGames: 0, wins: 0 }, H: { playedGames: 0, totalGames: 0, wins: 0 } },
        roleMap: {}
      };
      // 전체
      playerYear[pid][year].total.playedGames += row.totalGamesYear;
      playerYear[pid][year].total.totalGames += row.totalGamesYear;
      playerYear[pid][year].total.wins += row.totalWinsYear;
      // 맵별
      if (map) {
        if (!playerYear[pid][year].map[map]) playerYear[pid][year].map[map] = { playedGames: 0, totalGames: 0, wins: 0 };
        playerYear[pid][year].map[map].playedGames += row.totalGamesYear;
        playerYear[pid][year].map[map].totalGames += row.totalGamesYear;
        playerYear[pid][year].map[map].wins += row.totalWinsYear;
      }
      // 역할별
      if (role && playerYear[pid][year].role[role]) {
        playerYear[pid][year].role[role].playedGames += row.totalGamesYear;
        playerYear[pid][year].role[role].totalGames += row.totalGamesYear;
        playerYear[pid][year].role[role].wins += row.totalWinsYear;
      }

      // 역할+맵별
      if (role && map) {
        if (!playerYear[pid][year].roleMap[role]) playerYear[pid][year].roleMap[role] = {};
        if (!playerYear[pid][year].roleMap[role][map]) playerYear[pid][year].roleMap[role][map] = { playedGames: 0, totalGames: 0, wins: 0 };
        playerYear[pid][year].roleMap[role][map].playedGames += row.totalGamesYear;
        playerYear[pid][year].roleMap[role][map].totalGames += row.totalGamesYear;
        playerYear[pid][year].roleMap[role][map].wins += row.totalWinsYear;
      }

      // 월간
      if (!playerMonth[pid]) playerMonth[pid] = {};
      if (!playerMonth[pid][month]) playerMonth[pid][month] = {
        total: { playedGames: 0, totalGames: 0, wins: 0 },
        map: {},
        role: { D: { playedGames: 0, totalGames: 0, wins: 0 }, T: { playedGames: 0, totalGames: 0, wins: 0 }, H: { playedGames: 0, totalGames: 0, wins: 0 } },
        roleMap: {}
      };
      // 전체
      playerMonth[pid][month].total.playedGames += row.totalGamesMonth;
      playerMonth[pid][month].total.totalGames += row.totalGamesMonth;
      playerMonth[pid][month].total.wins += row.totalWinsMonth;
      // 맵별
      if (map) {
        if (!playerMonth[pid][month].map[map]) playerMonth[pid][month].map[map] = { playedGames: 0, totalGames: 0, wins: 0 };
        playerMonth[pid][month].map[map].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].map[map].totalGames += row.totalGamesMonth;
        playerMonth[pid][month].map[map].wins += row.totalWinsMonth;
      }
      // 역할별
      if (role && playerMonth[pid][month].role[role]) {
        playerMonth[pid][month].role[role].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].role[role].totalGames += row.totalGamesMonth;
        playerMonth[pid][month].role[role].wins += row.totalWinsMonth;
      }

      // 역할+맵별
      if (role && map) {
        if (!playerMonth[pid][month].roleMap[role]) playerMonth[pid][month].roleMap[role] = {};
        if (!playerMonth[pid][month].roleMap[role][map]) playerMonth[pid][month].roleMap[role][map] = { playedGames: 0, totalGames: 0, wins: 0 };
        playerMonth[pid][month].roleMap[role][map].playedGames += row.totalGamesMonth;
        playerMonth[pid][month].roleMap[role][map].totalGames += row.totalGamesMonth;
        playerMonth[pid][month].roleMap[role][map].wins += row.totalWinsMonth;
      }
    }

    // Player별로 winRates.byYear, byMonth 갱신
    for (const pid of Object.keys(playerYear)) {
      const byYear = {};
      for (const y of Object.keys(playerYear[pid])) {
        const d = playerYear[pid][y];
        d.total.requiredGames = Math.ceil(d.total.totalGames * 0.25);

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const m = d.map[mapName];
          mapObj[mapName] = {
            playedGames: m.playedGames,
            totalGames: m.totalGames,
            requiredGames: 0,
            wins: m.wins,
            rate: m.totalGames > 0 ? m.wins / m.totalGames : 0
          };
        }
        // 역할별
        const roleObj = {};
        for (const roleName of Object.keys(d.role)) {
          const r = d.role[roleName];
          roleObj[roleName] = {
            playedGames: r.playedGames,
            totalGames: r.totalGames,
            requiredGames: 0,
            wins: r.wins,
            rate: r.totalGames > 0 ? r.wins / r.totalGames : 0
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
              totalGames: rm.totalGames,
              requiredGames: 0,
              wins: rm.wins,
              rate: rm.totalGames > 0 ? rm.wins / rm.totalGames : 0
            };
          }
        }

        byYear[y] = {
          total: {
            playedGames: d.total.playedGames,
            totalGames: d.total.totalGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            rate: d.total.totalGames > 0 ? d.total.wins / d.total.totalGames : 0
          },
          map: mapObj,
          role: roleObj,
          roleMap: roleMapObj
        };
      }
      const byMonth = {};
      for (const m of Object.keys(playerMonth[pid])) {
        const d = playerMonth[pid][m];
        d.total.requiredGames = d.total.totalGames > 100 ? 30 : 25;

        // 맵별
        const mapObj = {};
        for (const mapName of Object.keys(d.map)) {
          const mm = d.map[mapName];
          mapObj[mapName] = {
            playedGames: mm.playedGames,
            totalGames: mm.totalGames,
            requiredGames: 0,
            wins: mm.wins,
            rate: mm.totalGames > 0 ? mm.wins / mm.totalGames : 0
          };
        }
        // 역할별
        const roleObj = {};
        for (const roleName of Object.keys(d.role)) {
          const rr = d.role[roleName];
          roleObj[roleName] = {
            playedGames: rr.playedGames,
            totalGames: rr.totalGames,
            requiredGames: 0,
            wins: rr.wins,
            rate: rr.totalGames > 0 ? rr.wins / rr.totalGames : 0
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
              totalGames: rm.totalGames,
              requiredGames: 0,
              wins: rm.wins,
              rate: rm.totalGames > 0 ? rm.wins / rm.totalGames : 0
            };
          }
        }

        byMonth[m] = {
          total: {
            playedGames: d.total.playedGames,
            totalGames: d.total.totalGames,
            requiredGames: d.total.requiredGames,
            wins: d.total.wins,
            rate: d.total.totalGames > 0 ? d.total.wins / d.total.totalGames : 0
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
};
