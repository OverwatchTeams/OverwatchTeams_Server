// LeaderBoard 집계 함수
async function aggregateLeaderBoardDatas(Match, gameDatas, Player, date) {
  const [year, month, day] = date.split('-').map(Number);
  // 집계
  const agg = await Match.aggregate([
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
      $project: {
        player: 1,
        day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        map: 1,
        role: 1,
        index: 1,
        round: 1,
        win: { $cond: [{ $eq: ["$winlose", "승"] }, 1, 0] },
        loss: { $cond: [{ $eq: ["$winlose", "패"] }, 1, 0] },
        draw: { $cond: [{ $eq: ["$winlose", "무"] }, 1, 0] }
      }
    }
  ]);

  console.log('=== LeaderBoard Debug ===');
  console.log('Date:', date);
  console.log('Year:', year, 'Month:', month, 'Day:', day);
  console.log('Aggregation result count:', agg.length);

  // 게임 순서대로 정렬 (streak 계산을 위해 - index 내림차순)
  agg.sort((a, b) => a.index - b.index);

  const allPlayers = await Player.find({});
  const playerMap = new Map(allPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));

  // 일별 리더보드
  const byDay = {};
  
  // streak 계산을 위한 플레이어별 게임 기록 추적
  const playerGameHistory = new Map();

  for (const row of agg) {
    const player = String(playerMap.get(row.player)?.player || row.player);
    const map = row.map;
    const day = String(row.day);

    // 일별 최소경기수 (기본값을 1로 설정)
    const minRequiredRoundDay = gameDatas.byDay?.[day]?.minRequiredRound || 1;

    // 일별 초기화
    if (!byDay[day]) {
      byDay[day] = {
        winRate: { total: {} },
        attendance: { total: {}, map: {}, minRequiredRound: minRequiredRoundDay }
      };
    }

    const targets = [byDay[day]];
    for (const target of targets) {
      // total
      if (!target.winRate.total[player]) {
        target.winRate.total[player] = { wins: 0, losses: 0, draws: 0, winRate: 0, gap: 0, streak: 0, ranking: 0, isMinRequired: false };
      }
      target.winRate.total[player].wins += row.win;
      target.winRate.total[player].losses += row.loss;
      target.winRate.total[player].draws += row.draw;

      // streak 계산을 위한 게임 기록 추가
      if (!playerGameHistory.has(player)) {
        playerGameHistory.set(player, []);
      }
      
      // 게임 결과 기록 (1: 승리, 0: 무승부, -1: 패배)
      let gameResult = 0;
      if (row.win) gameResult = 1;
      else if (row.loss) gameResult = -1;
      
      playerGameHistory.get(player).push({
        index: row.index,
        round: row.round,
        date: row.day,
        result: gameResult
      });

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

  // streak 계산 함수
  function calculateStreak(gameHistory) {
    if (!gameHistory || gameHistory.length === 0) return 0;
    
    // 게임 순서대로 정렬 (index 오름차순)
    gameHistory.sort((a, b) => a.index - b.index);
    
    let streak = 0;
    const lastResult = gameHistory[gameHistory.length - 1].result; // 가장 최근(마지막) 게임 결과
    
    // 가장 최근 게임부터 역순으로 확인하여 연속된 같은 결과 카운트
    for (let i = gameHistory.length - 1; i >= 0; i--) {
      const currentResult = gameHistory[i].result;
      
      if (currentResult === lastResult && currentResult !== 0) {
        // 최근 결과와 같고 무승부가 아닌 경우
        if (currentResult === 1) streak++;        // 연승
        else if (currentResult === -1) streak--;  // 연패 (음수로 표현)
      } else if (currentResult !== lastResult) {
        // 다른 결과가 나오면 streak 종료
        break;
      }
      // 무승부(0)인 경우는 streak에 영향을 주지 않고 계속 진행
    }
    
    return streak;
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
        
        // gap 계산 (승리 - 패배)
        data.gap = data.wins - data.losses;
        
        // streak 계산
        const playerHistory = playerGameHistory.get(player);
        data.streak = calculateStreak(playerHistory);
        
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

  finalize(byDay, "byDay", "byDay");

  // Map 변환
  const result = {
    byDay: new Map(Object.entries(byDay))
  };

  return result;
}

module.exports = { aggregateLeaderBoardDatas };