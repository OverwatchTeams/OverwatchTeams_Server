const connectToDatabase = require('./db');
const Map = require('./models/Map');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
      return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  // API Gateway에서 Name은 pathParameters로 전달됨
  const { Name } = event.queryStringParameters || {};

  if (!Name) {
    return createErrorResponse('Name 파라미터가 필요합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const deleted = await Map.findOneAndDelete({ name: Name });
    if (!deleted) {
      return createErrorResponse('맵을 찾을 수 없습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return createSuccessResponse('맵을 삭제하였습니다.', deleted.name, SUCCESS_CODES.DATA_DELETED, HTTP_STATUS.OK);
  } catch (err) {
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATA_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};