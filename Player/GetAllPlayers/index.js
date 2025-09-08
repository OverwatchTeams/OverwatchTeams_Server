const connectToDatabase = require('./db');
const Player = require('./models/Player');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES, createSuccessResponse, createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
  // 유효한 Player 스키마 필드들 정의
  const validFields = [
    'player', 'isClanMember', 'isVoiceAvailable', 'dates', 'scores', 'subNames', 
    'winRates', 'synergy', 'createdAt', 'updatedAt',
  ];

  try {
    await connectToDatabase();
  } catch (err) {
    return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  try {
    // 쿼리 파라미터(클랜멤버 필터링, 반환 필드 필터링, 정렬 옵션)
    const queryParams = event.queryStringParameters;
    if (!queryParams) {
      return createErrorResponse('쿼리 파라미터가 입력되지 않았습니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }

    const clanMember = queryParams.ClanMember;
    const fields = queryParams.Fields;
    const sort = queryParams.Sort;

    // 파라미터 타입 체크 및 유효성 검증
    if (clanMember && clanMember !== 'true' && clanMember !== 'false') {
      return createErrorResponse('ClanMember 파라미터 값이 올바르지 않습니다.', ERROR_CODES.INVALID_FIELD_VALUE, HTTP_STATUS.BAD_REQUEST);
    }
    
    if (fields && typeof fields !== 'string') {
      return createErrorResponse('Fields 파라미터 타입이 올바르지 않습니다.', ERROR_CODES.INVALID_FIELD_TYPE, HTTP_STATUS.BAD_REQUEST);
    }
    
    // 필드 유효성 검증
    if (fields && fields !== 'all') {
      const requestedFields = fields.split(',').map(field => field.trim());
      const invalidFields = requestedFields.filter(field => !validFields.includes(field));
      
      if (invalidFields.length > 0) {
        return createErrorResponse(
          `유효하지 않은 필드입니다: ${invalidFields.join(', ')}. 사용 가능한 필드: ${validFields.join(', ')}`,
          ERROR_CODES.INVALID_FIELD_VALUE,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
    
    if (sort && sort !== 'recent' && sort !== 'dic') {
      return createErrorResponse('Sort 파라미터 값이 올바르지 않습니다.', ERROR_CODES.INVALID_FIELD_VALUE, HTTP_STATUS.BAD_REQUEST);
    }

    // 클랜 멤버 필터링
    const queryOptions = {};
    if (clanMember === 'true') {
      queryOptions.isClanMember = true;
    }

    // 반환 필드 필터링
    let projection = {};
    if (fields) {
      if (fields === 'all') {
        projection = {}; // Empty projection returns all fields
      } else {
        fields.split(',').forEach((field) => {
          projection[field.trim()] = 1; // Include specified fields
        });
      }
    }

    // 정렬 옵션
    let sortOptions = {};
    if (sort === 'recent') {
      sortOptions = { 'dates.last': -1 }; // 최신순 정렬
    } else if (sort === 'dic') {
      sortOptions = { player: 1 }; // 이름순 정렬
    }

    // 데이터 조회
    const players = await Player.find(queryOptions, projection).sort(sortOptions);

    //성공 응답 생성
    return createSuccessResponse( '모든 플레이어 데이터 조회 성공', players, SUCCESS_CODES.DATA_RETRIEVED , HTTP_STATUS.OK);
  } catch (err) {
    //유효성 에러
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }

    // 서버 에러
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};