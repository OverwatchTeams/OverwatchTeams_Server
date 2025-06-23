const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Main = require('./models/Main');
const Match = require('./models/Match');
const Player = require('./models/Player');
const { aggregateGameDatas } = require('./utils/gameDataUtil');
const { aggregateLeaderBoardDatas } = require('./utils/leaderBoardUtil');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    // 1. 게임 데이터 집계
    const gameDatas = await aggregateGameDatas(Match);

    // 2. 리더보드 집계
    const { byYear, byMonth } = await aggregateLeaderBoardDatas(Match, gameDatas, Player);

    // 3. 최신 Match의 날짜 가져오기
    const latestMatch = await Match.findOne().sort({ date: -1 }).select('date');
    const updateDate = latestMatch?.date || new Date(); // 최신 날짜가 없으면 현재 날짜 사용


    const leaderBoard = {
      byYear,
      byMonth
    };

    // 4. Main 문서 upsert (없으면 생성, 있으면 갱신)
    const mainDoc = await Main.findOneAndUpdate(
      {},
      { updateDate, gameDatas, leaderBoard}, // updateDate 추가
      { new: true, upsert: true }
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Main document updated successfully.', id: mainDoc._id }),
    };
  } catch (error) {
    console.error('Update failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating Main document.', error: error.message }),
    };
  }
};
