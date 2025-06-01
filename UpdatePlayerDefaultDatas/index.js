const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();
  try {
    // 1. 전체 기간의 player 목록 중복 없이 수집
    const uniquePlayers = await Match.distinct('player');

    // 2.1 각 player별로 첫/마지막 참가 날짜 조회
    const players = await Match.aggregate([
      {
        $group: {
          _id: "$player",
          first: { $min: "$date" },
          last: { $max: "$date" }
        }
      }
    ]);

    // 5. Player 컬렉션에 upsert
    for (const p of players) {
      await Player.findOneAndUpdate(
        { player: p._id },
        {
          $set: {
            'dates.first': p.first,
            'dates.last': p.last,
          },
          $setOnInsert: {
            isClanMember: false,
            'scores.D': 0,
            'scores.T': 0,
            'scores.H': 0,
          },
        },
        { upsert: true, new: true }
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
