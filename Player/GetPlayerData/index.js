const connectToDatabase = require('./db');
const Player = require('./models/Player');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES, createSuccessResponse, createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

    // 쿼리 파라미터(클랜멤버 필터링, 반환 필드 필터링, 정렬 옵션)
  const name = event.queryStringParameters?.Name;
  if (!name) {
    return createErrorResponse('플레이어 이름이 입력되어야 합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // 데이터 조회
    let player = await Player.findOne({ player: name });


    if (!player) {
          return createErrorResponse('해당 플레이어가 존재하지 않습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return createSuccessResponse( `${player.player}플레이어 데이터 조회 성공`, player, SUCCESS_CODES.DATA_RETRIEVED , HTTP_STATUS.OK);
  } catch (err) {
    //유효성 에러
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    // 서버 에러
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};