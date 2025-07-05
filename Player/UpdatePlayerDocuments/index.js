const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');
const { aggregateWinRate } = require('./utils/winRateUtils');
const { aggregateSynergy } = require('./utils/synergyUtils');

exports.handler = async (event) => {
  await connectToDatabase();
  try {
    // 1 각 player별로 첫/마지막 참가 날짜 조회
    const players = await Match.aggregate([
      {
        $group: {
          _id: "$player",
          first: { $min: "$date" },
          last: { $max: "$date" },
          lastRound: { $max: "$round" }
        }
      }
    ]);

    await Player.updateMany({}, { $unset: { dates: {} } });
    let allPlayers = await Player.find({});
    let playerMap = new Map(allPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));

    // 2. Player 컬렉션에 upsert
    for (const p of players) {
      let id;
      let last;
      let first;
      let lastRound;
      let myself = playerMap.get(p._id);
      if(!myself)
      {
        id = p._id;
        first = p.first;
        last = p.last;
        lastRound = p.lastRound;
      } 
      else
      {
        id = myself.player;
        myself.dates.first = myself.dates.first === null || p.first < myself.dates.first ? p.first : myself.dates.first;
        first = myself.dates.first;
        myself.dates.last = myself.dates.last === null || p.last > myself.dates.last ? p.last : myself.dates.last;
        last = myself.dates.last;
        myself.dates.lastRound = p.lastRound !== null && (myself.dates.lastRound === null || p.lastRound > myself.dates.lastRound) ? p.lastRound : myself.dates.lastRound;
        lastRound = myself.dates.lastRound;
      }

    
      await Player.findOneAndUpdate(
        { player: id },
        {
          $set: {
            'dates.first': first,
            'dates.last': last, 
            'dates.lastRound': lastRound, 
          },
          $setOnInsert: {
            isClanMember: false,
            'scores.D': 0.00,
            'scores.T': 0.00,
            'scores.H': 0.00,
          },
        },
        { upsert: true, new: true }
      );
      if(!myself)
      {
        allPlayers = await Player.find({});
        playerMap = new Map(allPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));
      }
    }

    await aggregateWinRate(Match, Player);
    await aggregateSynergy(Match, Player);


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
