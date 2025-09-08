const connectToDatabase = require('./db');
const MapType = require('./models/MapType');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  try {
    await connectToDatabase();
  } catch (err) {
      return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  let maptype;
  try {
    maptype = JSON.parse(event.body);
  } catch (err) {
      return createErrorResponse('요청 body가 올바른 JSON 형식이 아닙니다.', ERROR_CODES.INVALID_JSON, HTTP_STATUS.BAD_REQUEST);
  }

  const requiredFields = ['index', 'name', 'isAtkDef'];
  for (const field of requiredFields) {
    if (maptype[field] === undefined || maptype[field] === null) {
        return createErrorResponse(`${field} 필드는 필수입니다.`, ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }
  }

  try {
    const existingMapType = await MapType.findOne({ name: maptype.name });
      if (existingMapType) {
        return createErrorResponse('이미 존재하는 맵타입입니다.', ERROR_CODES.DUPLICATE_DATA, HTTP_STATUS.CONFLICT);
      }
    const insertedMapType = new MapType(maptype);
    await insertedMapType.save();
    return createSuccessResponse('맵타입을 생성하였습니다.', insertedMapType.name, SUCCESS_CODES.DATA_CREATED, HTTP_STATUS.CREATED);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
        
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATA_CREATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};