const connectToDatabase = require('./db');
const Match = require('./models/Match');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
    try {
      await connectToDatabase();
    } catch (err) {
      return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

  // round를 pathParameters 또는 queryStringParameters에서 받아옵니다.
  const round =
    (event.pathParameters && event.pathParameters.round) ||
    (event.queryStringParameters && event.queryStringParameters.round);

  if (!round) {
    return createErrorResponse('round 값이 필요합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // round는 숫자이므로 Number로 변환
    const roundNumber = Number(round);
    if (isNaN(roundNumber)) {
      return createErrorResponse('round 값은 숫자여야 합니다.', ERROR_CODES.INVALID_FIELD_TYPE, HTTP_STATUS.BAD_REQUEST);
    }

    const result = await Match.deleteMany({ round: roundNumber });

    if (result.deletedCount === 0) {
      return createErrorResponse('해당 round의 경기데이터가 없습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(
      `라운드 ${roundNumber}의 경기 데이터가 삭제되었습니다.`, roundNumber, SUCCESS_CODES.DATA_DELETED,HTTP_STATUS.OK);
  } catch (err) {
    return createErrorResponse(`서버 내부에 예상치 못한 오류가 발생했습니다.: ${err.message}`, ERROR_CODES.DATA_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};