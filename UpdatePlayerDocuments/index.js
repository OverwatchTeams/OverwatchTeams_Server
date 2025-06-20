const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');
const { aggregateWinRate } = require('./utils/winRateUtils');
const { aggregateSynergy } = require('./utils/synergyUtils');

exports.handler = async (event) => {
  await connectToDatabase();
  try {
    // 2.1 각 player별로 첫/마지막 참가 날짜 조회
    const players = await Match.aggregate([
      {
        $group: {
          _id: "$player", // 그룹화 기준 필드
          first: { $min: "$date" },
          last: { $max: "$date" },
          lastRound: { $max: "$round" }
        }
      }
    ]);

    let allPlayers = await Player.find({});
    let playerMap = new Map(allPlayers.flatMap(p => [[p.player, p], ...p.subNames.map(sub => [sub, p])]));

    // 5. Player 컬렉션에 upsert
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
        myself.dates.lastRound = myself.dates.lastRound === null || p.lastRound > myself.dates.lastRound ? p.lastRound : myself.dates.lastRound;
        lastRound = myself.dates.lastRound;
        console.log('id', id, 'first', '0: ', first, '1: ', p.first, '2: ', myself.dates.first);
        console.log('id', id, 'last', '0: ', last, '1: ', p.last, '2: ', myself.dates.last);
        console.log('id', id, 'lastRound', '0: ', lastRound, '1: ', p.lastRound, '2: ', myself.dates.lastRound);
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
            'scores.D': 0,
            'scores.T': 0,
            'scores.H': 0,
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
