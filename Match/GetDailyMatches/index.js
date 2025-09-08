const connectToDatabase = require('./db');
const Match = require('./models/Match');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  try {
    // queryStringParameters에서 date 파라미터 추출
    const { date } = event.queryStringParameters || {};

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

    // 입력받은 날짜의 시작과 끝 시간 설정
    const startDate = new Date(date + 'T00:00:00.000Z');
    const endDate = new Date(date + 'T23:59:59.999Z');

    // 해당 날짜의 Match 정보를 index 오름차순으로 조회
    const matches = await Match.find({
      date: {
        $gte: startDate,
        $lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000) // 다음 날 00:00:00
      }
    }).sort({ index: 1 });

    return createSuccessResponse(
      '일간 경기 데이터 조회를 성공하였습니다.', matches, SUCCESS_CODES.DATA_RETRIEVED, HTTP_STATUS.OK);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};