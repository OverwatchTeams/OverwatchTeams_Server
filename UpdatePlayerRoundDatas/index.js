const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();
  try {
    // 1. 플레이어별 연도별 라운드 수 집계
    const yearAgg = await Match.aggregate([
      {
        $group: {
          _id: {
            player: "$player",
            year: { $year: "$date" }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. 플레이어별 월별 라운드 수 집계
    const monthAgg = await Match.aggregate([
      {
        $group: {
          _id: {
            player: "$player",
            month: { $dateToString: { format: "%Y-%m", date: "$date" } }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. 연도별 중복 없는 라운드 수 집계 (totalbyYear)
    const totalByYearAgg = await Match.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            round: "$round"
          }
        }
      },
      {
        $group: {
          _id: "$_id.year",
          total: { $sum: 1 }
        }
      }
    ]);

    // 4. 월별 중복 없는 라운드 수 집계 (totalbyMonth)
    const totalByMonthAgg = await Match.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            round: "$round"
          }
        }
      },
      {
        $group: {
          _id: "$_id.month",
          total: { $sum: 1 }
        }
      }
    ]);

    // 5. 집계 결과 정리
    const playByYearMap = {};
    yearAgg.forEach(item => {
      const player = item._id.player;
      const year = String(item._id.year);
      if (!playByYearMap[player]) playByYearMap[player] = {};
      playByYearMap[player][year] = item.count;
    });

    const playByMonthMap = {};
    monthAgg.forEach(item => {
      const player = item._id.player;
      const month = item._id.month;
      if (!playByMonthMap[player]) playByMonthMap[player] = {};
      playByMonthMap[player][month] = item.count;
    });

    const totalByYearMap = {};
    totalByYearAgg.forEach(item => {
      totalByYearMap[item._id] = item.total;
    });

    const totalByMonthMap = {};
    totalByMonthAgg.forEach(item => {
      totalByMonthMap[item._id] = item.total;
    });

    // 6. 최소 규정 라운드 계산
    // 월간: 100 초과면 30, 아니면 25
    const requiredByMonthMap = {};
    Object.entries(totalByMonthMap).forEach(([month, total]) => {
      requiredByMonthMap[month] = total > 100 ? 30 : 25;
    });

    // 연간: 전체 라운드의 25% (올림)
    const requiredByYearMap = {};
    Object.entries(totalByYearMap).forEach(([year, total]) => {
      requiredByYearMap[year] = Math.ceil(total * 0.25);
    });

    // 7. Player 컬렉션에 업데이트
    const players = await Match.aggregate([
      { $group: { _id: "$player" } }
    ]);
    for (const player of players) {
      const playerName = player._id;
      await Player.findOneAndUpdate(
        { player: playerName },
        {
          $set: {
            'roundsCount.playByYear': playByYearMap[playerName] || {},
            'roundsCount.playByMonth': playByMonthMap[playerName] || {},
            'roundsCount.totalbyYear': totalByYearMap || {},
            'roundsCount.totalbyMonth': totalByMonthMap || {},
            'roundsCount.requiredByMonth': requiredByMonthMap || {},
            'roundsCount.requiredByYear': requiredByYearMap || {}
          }
        },
        { upsert: false }
      );
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All player data updated successfully.' }),
    };

  } catch (error) {
    console.error('Update failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating player data.', error }),
    };
  }
};
