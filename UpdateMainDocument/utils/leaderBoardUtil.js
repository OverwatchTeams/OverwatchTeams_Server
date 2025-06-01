// LeaderBoard 집계 함수
async function aggregateLeaderBoardDatas(Match, gameDatas) {
  // 내부 집계 함수
  async function aggregate(periodType) {
    const result = {};
    for (const periodKey of Object.keys(gameDatas[periodType])) {
      const periodGameData = gameDatas[periodType][periodKey];
      const minRequiredRound = periodGameData.minRequiredRound || 0;

      // 기간 내 모든 매치 조회
      let matchQuery = {};
      if (periodType === 'byYear') {
        const year = Number(periodKey);
        matchQuery = { date: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } };
      } else if (periodType === 'byMonth') {
        const [year, month] = periodKey.split('-').map(Number);
        matchQuery = { date: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } };
      }
      const matches = await Match.find(matchQuery);

      // 집계용 객체
      const playerStats = {};
      const roleStats = { D: {}, T: {}, H: {} };
      const mapStats = {};
      const roleMapStats = { D: {}, T: {}, H: {} };
      const attendanceStats = {};

      // 집계
      for (const match of matches) {
        // 전체
        if (!playerStats[match.player]) playerStats[match.player] = { wins: 0, losses: 0, total: 0 };
        if (match.winlose === '승') playerStats[match.player].wins++;
        if (match.winlose === '패') playerStats[match.player].losses++;
        playerStats[match.player].total++;

        // 역할별
        if (!roleStats[match.role][match.player]) roleStats[match.role][match.player] = { wins: 0, losses: 0, total: 0 };
        if (match.winlose === '승') roleStats[match.role][match.player].wins++;
        if (match.winlose === '패') roleStats[match.role][match.player].losses++;
        roleStats[match.role][match.player].total++;

        // 맵별
        if (!mapStats[match.map]) mapStats[match.map] = {};
        if (!mapStats[match.map][match.player]) mapStats[match.map][match.player] = { wins: 0, losses: 0, total: 0 };
        if (match.winlose === '승') mapStats[match.map][match.player].wins++;
        if (match.winlose === '패') mapStats[match.map][match.player].losses++;
        mapStats[match.map][match.player].total++;

        // 역할-맵별
        if (!roleMapStats[match.role][match.map]) roleMapStats[match.role][match.map] = {};
        if (!roleMapStats[match.role][match.map][match.player]) roleMapStats[match.role][match.map][match.player] = { wins: 0, losses: 0, total: 0 };
        if (match.winlose === '승') roleMapStats[match.role][match.map][match.player].wins++;
        if (match.winlose === '패') roleMapStats[match.role][match.map][match.player].losses++;
        roleMapStats[match.role][match.map][match.player].total++;

        // 출석
        if (!attendanceStats[match.player]) attendanceStats[match.player] = { playedGames: 0 };
        attendanceStats[match.player].playedGames++;
      }

      // 전체 게임 수
      const totalGames = periodGameData.totalGames || matches.length;

      // 출석 랭킹 산정 및 정렬
      const attendanceArr = Object.entries(attendanceStats).map(([player, att]) => ({
        player,
        playedGames: att.playedGames,
        totalGames,
        isMinRequired: att.playedGames >= minRequiredRound,
      }));
      attendanceArr.sort((a, b) => b.playedGames - a.playedGames);
      attendanceArr.forEach((item, idx) => { item.ranking = idx + 1; });

      // total(전체)만 ranking, isMinRequired 포함
      function makeTotalWinRateObj(statsObj, minRequiredRound, totalGames, checkMinRequired = true) {
        const arr = [];
        for (const player in statsObj) {
          const stat = statsObj[player];
          const winRate = stat.total > 0 ? Math.round((stat.wins / stat.total) * 1000) / 10 : 0;
          const isMinRequired = checkMinRequired
            ? stat.total >= Math.floor(totalGames * minRequiredRound)
            : true;
          arr.push({
            player,
            winRate,
            wins: stat.wins,
            losses: stat.losses,
            total: stat.total,
            isMinRequired,
          });
        }
        arr.sort((a, b) => {
          if (b.isMinRequired !== a.isMinRequired) return b.isMinRequired - a.isMinRequired;
          return b.winRate - a.winRate || b.wins - a.wins;
        });
        arr.forEach((item, idx) => { item.ranking = idx + 1; });
        const resultObj = {};
        for (const item of arr) {
          resultObj[item.player] = {
            ranking: item.ranking,
            winRate: item.winRate,
            wins: item.wins,
            losses: item.losses,
            isMinRequired: item.isMinRequired,
          };
        }
        return resultObj;
      }

      // map/role/roleMap에는 ranking, isMinRequired 없이
      function makeSimpleWinRateObj(statsObj) {
        const resultObj = {};
        for (const player in statsObj) {
          const stat = statsObj[player];
          const winRate = stat.total > 0 ? Math.round((stat.wins / stat.total) * 1000) / 10 : 0;
          resultObj[player] = {
            winRate,
            wins: stat.wins,
            losses: stat.losses,
          };
        }
        return resultObj;
      }

      // 전체 승률(최소 요구 경기수 적용)
      const totalWinRateObj = makeTotalWinRateObj(playerStats, minRequiredRound / totalGames, totalGames, true);

      // 역할별 승률(최소 요구 경기수 미적용)
      const roleWinRateObj = {};
      for (const role of ['D', 'T', 'H']) {
        roleWinRateObj[role] = makeSimpleWinRateObj(roleStats[role]);
      }

      // 맵별 승률(최소 요구 경기수 미적용)
      const mapWinRateObj = {};
      for (const map in mapStats) {
        mapWinRateObj[map] = makeSimpleWinRateObj(mapStats[map]);
      }

      // 역할-맵별 승률(최소 요구 경기수 미적용)
      const roleMapWinRateObj = {};
      for (const role of ['D', 'T', 'H']) {
        roleMapWinRateObj[role] = {};
        for (const map in roleMapStats[role]) {
          roleMapWinRateObj[role][map] = makeSimpleWinRateObj(roleMapStats[role][map]);
        }
      }

      // 출석 랭킹
      const attendanceObj = {};
      attendanceArr.forEach(item => {
        attendanceObj[item.player] = {
          ranking: item.ranking,
          playedGames: item.playedGames,
          totalGames: item.totalGames,
          isMinRequired: item.isMinRequired,
        };
      });

      // leaderBoardSchema에 맞게 변환
      result[periodKey] = {
        winRate: {
          total: totalWinRateObj,
          role: {
            D: roleWinRateObj.D,
            T: roleWinRateObj.T,
            H: roleWinRateObj.H,
          },
          map: mapWinRateObj,
          roleMap: {
            D: roleMapWinRateObj.D,
            T: roleMapWinRateObj.T,
            H: roleMapWinRateObj.H,
          },
        },
        attendance: attendanceObj,
      };
    }
    // Map 타입에 맞게 변환해서 반환
  
    return result;
  }

  // 두 집계 한 번에 반환 (byYear, byMonth 모두 Map)
  return {
    byYear: await aggregate('byYear'),
    byMonth: await aggregate('byMonth'),
  };
}

module.exports = { aggregateLeaderBoardDatas };