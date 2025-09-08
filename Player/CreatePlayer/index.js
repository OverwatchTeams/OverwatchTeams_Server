const connectToDatabase = require('./db');
const Player = require('./models/Player');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  let player;
  try {
    player = JSON.parse(event.body);
  } catch (err) {
    return createErrorResponse('요청 body가 올바른 JSON 형식이 아닙니다.', ERROR_CODES.INVALID_JSON, HTTP_STATUS.BAD_REQUEST);
  }

  const requiredFields = ['player'];
  for (const field of requiredFields) {
    if (player[field] === undefined || player[field] === null || player[field] === '') {
      return createErrorResponse(`${field} 필드는 필수입니다.`, ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }
  }

  // null이 아닌 값만 추출
  const updateFields = {};
  for (const key in player) {
    if (player[key] !== null && player[key] !== undefined) {
      updateFields[key] = player[key];
    }
  }

  try {
    // 기존 플레이어 확인
    const existingPlayer = await Player.findOne({ player: player.player });
    
    // 새로 추가하려는 본계정 이름이 다른 플레이어의 부계정 이름과 중복되는지 확인
    if (!existingPlayer) {
      const duplicateInSubNames = await Player.findOne({ 
        subNames: { $in: [player.player] } 
      });
      
      if (duplicateInSubNames) {
        return createErrorResponse('이미 다른 플레이어의 부계정으로 등록된 이름입니다.', ERROR_CODES.DUPLICATE_DATA, HTTP_STATUS.CONFLICT);
      }
    }
    
    // 플레이어 업데이트 또는 생성
    const updatedPlayer = await Player.findOneAndUpdate(
      { player: player.player }, // 조건: player 필드가 동일한 경우
      updateFields, // null이 아닌 값만 업데이트
      { new: true, upsert: true, runValidators: true }
    );

    // subNames에 포함된 이름과 동일한 player 데이터를 삭제
    if (updatedPlayer.subNames && updatedPlayer.subNames.length > 0) {
      await Player.deleteMany({ player: { $in: updatedPlayer.subNames } });
    }

    const isNewPlayer = !existingPlayer;
    const successMessage = isNewPlayer ? '플레이어를 데이터를 생성하였습니다.' : '플레이어 데이터를 업데이트하였습니다';
    const successCode = isNewPlayer ? SUCCESS_CODES.DATA_CREATED : SUCCESS_CODES.DATA_UPDATED;
    const statusCode = isNewPlayer ? HTTP_STATUS.CREATED : HTTP_STATUS.OK;
    
    //성공 응답 생성
    return createSuccessResponse( successMessage, updatedPlayer.player, successCode, statusCode );
  //에러 응답 생성
  } catch (err) { 
    //유효성 에러
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    
    // 중복 데이터 에러
    if (err.code === 11000) {
      return createErrorResponse('이미 존재하는 플레이어입니다.', ERROR_CODES.DUPLICATE_DATA, HTTP_STATUS.CONFLICT);
    }
    
    // 서버 에러
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};