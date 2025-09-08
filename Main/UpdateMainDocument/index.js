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

    return createSuccessResponse('모든 메인 데이터 업데이트 성공.', true, SUCCESS_CODES.DATA_UPDATED, HTTP_STATUS.OK);

  } catch (error) {
    //유효성 에러
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATA_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
