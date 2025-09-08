const connectToDatabase = require('./db');
const Player = require('./models/Player');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES, createSuccessResponse, createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err);
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  const name = event.queryStringParameters?.Name;
  if (!name) {
    return createErrorResponse('플레이어 이름이 입력되어야 합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const deletedPlayer = await Player.findOneAndDelete({ player: name });
    if (!deletedPlayer) {
      return createErrorResponse('해당 플레이어가 존재하지 않습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return createSuccessResponse('플레이어를 성공적으로 삭제했습니다.', deletedPlayer.player, SUCCESS_CODES.DATA_DELETED, HTTP_STATUS.OK);
  } catch (err) {
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATA_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};