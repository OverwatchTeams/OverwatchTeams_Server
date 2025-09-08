const connectToDatabase = require('./db');
const Match = require('./models/Match');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  let matches;
  try {
    matches = JSON.parse(event.body); // body는 Match 객체 10개가 들어있는 배열이어야 함
    if (!Array.isArray(matches) || matches.length !== 10) {
      return createErrorResponse('10개의 Match 데이터 배열을 모두 전달해야 합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }
  } catch (error) {
    return createErrorResponse('요청 body가 올바른 JSON 형식이 아닙니다.', ERROR_CODES.INVALID_JSON, HTTP_STATUS.BAD_REQUEST);
  }

  const requiredFields = ['index', 'date', 'round', 'map', 'role', 'player', 'atkdef', 'winlose'];

  // 모든 Match 데이터 검증
  for (let i = 0; i < matches.length; i++) {
    for (const field of requiredFields) {
      if (!matches[i][field]) {
        return createErrorResponse(`배열 ${i}번째 데이터의 ${field} 필드는 필수입니다.`, ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
      }
    }
  }

  try {
    // 한번에 여러 문서 삽입
    const insertedMatches = await Match.insertMany(matches);

    return createSuccessResponse('경기 데이터가 성공적으로 생성되었습니다.', matches[0][2], SUCCESS_CODES.DATA_CREATED, HTTP_STATUS.CREATED);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};