const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Main = require('./models/Main');
const Match = require('./models/Match');
const Player = require('./models/Player');
const { aggregateGameDatas } = require('./utils/gameDataUtil');
const { aggregateLeaderBoardDatas } = require('./utils/leaderBoardUtil');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  // queryStringParameters에서 date 추출
  const date = event.queryStringParameters?.date;

    if (!date) {
      return createErrorResponse(
        '날짜를 입력하여야 합니다. (YYYY-MM-DD)',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return createErrorResponse('날짜의 형식이 잘못되었습니다. YYYY-MM-DD 형식을 사용하세요.', ERROR_CODES.INVALID_FIELD_VALUE, HTTP_STATUS.BAD_REQUEST);
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

    return createSuccessResponse(
      '일간 경기 데이터 조회를 성공하였습니다.', dateData, SUCCESS_CODES.DATA_RETRIEVED, HTTP_STATUS.OK);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
