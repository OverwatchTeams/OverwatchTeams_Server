const connectToDatabase = require('./db');
const Match = require('./models/Match');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async () => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  try {
    const latestMatch = await Match.findOne({})
      .sort({ index: -1 }) // 최신순
      .lean(); // JSON 변환 최적화

    return createSuccessResponse('최신 매치 조회 성공', latestMatch || {}, SUCCESS_CODES.DATA_RETRIEVED, HTTP_STATUS.OK);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};