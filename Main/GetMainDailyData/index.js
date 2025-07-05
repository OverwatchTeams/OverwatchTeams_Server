const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Main = require('./models/Main');
const Match = require('./models/Match');
const Player = require('./models/Player');
const { aggregateGameDatas } = require('./utils/gameDataUtil');
const { aggregateLeaderBoardDatas } = require('./utils/leaderBoardUtil');

exports.handler = async (event) => {
  await connectToDatabase();

  // queryStringParameters에서 date 추출
  const date = event.queryStringParameters?.date;

  if (!date) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'date parameter is required' }),
    };
  }

  try {
    // 1. 게임 데이터 집계
    const gameDatas = await aggregateGameDatas(Match, date);

    // 2. 리더보드 집계
    const { byDay } = await aggregateLeaderBoardDatas(Match, gameDatas, Player, date);

    // 3. 최신 Match의 날짜 가져오기
    const updateDate = date;

    // Map을 일반 객체로 변환
    const convertMapToObject = (map) => {
      const result = {};
      for (const [key, value] of map) {
        if (value && typeof value === 'object') {
          if (value instanceof Map) {
            result[key] = convertMapToObject(value);
          } else if (value.winRate && value.attendance) {
            // 리더보드 구조 변환
            result[key] = {
              winRate: {
                total: value.winRate.total instanceof Map ? convertMapToObject(value.winRate.total) : value.winRate.total
              },
              attendance: {
                total: value.attendance.total instanceof Map ? convertMapToObject(value.attendance.total) : value.attendance.total,
                map: value.attendance.map,
                minRequiredRound: value.attendance.minRequiredRound,
                totalGames: value.attendance.totalGames
              }
            };
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    const leaderBoard = {
      byDay: convertMapToObject(byDay)
    };

    // 결과 데이터 구성
    const dateData = {
      updateDate,
      gameDatas,
      leaderBoard
    };

    return {
      statusCode: 200,
      body: JSON.stringify(dateData),
    };
  } catch (error) {
    console.error('Get failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error getting date data.', error: error.message }),
    };
  }
};
