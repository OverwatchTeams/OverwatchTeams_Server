// HTTP 상태 코드 정의
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// 에러 코드 정의
const ERROR_CODES = {
  // 요청 관련 에러 (E001-E099)
  INVALID_JSON: 'E001',
  MISSING_REQUIRED_FIELD: 'E002',
  INVALID_FIELD_TYPE: 'E003',
  INVALID_FIELD_VALUE: 'E004',
  
  // 데이터베이스 관련 에러 (E100-E199)
  DATABASE_CONNECTION_ERROR: 'E100',
  DATABASE_OPERATION_ERROR: 'E101',
  VALIDATION_ERROR: 'E102',
  DUPLICATE_ENTRY: 'E103',
  
  // 데이터 관련 에러 (E200-E299)
  DATA_NOT_FOUND: 'E200',
  DUPLICATE_DATA: 'E201',
  DATA_CREATION_FAILED: 'E202',
  DATA_UPDATE_FAILED: 'E203',
  
  // 시스템 관련 에러 (E900-E999)
  INTERNAL_ERROR: 'E900',
  SERVICE_UNAVAILABLE: 'E901',
  TIMEOUT_ERROR: 'E902'
};

// 성공 코드 정의
const SUCCESS_CODES = {
  DATA_CREATED: 'S001',
  DATA_UPDATED: 'S002',
  DATA_DELETED: 'S003',
  DATA_RETRIEVED: 'S004'
};

/**
 * 표준화된 응답 생성 함수
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message - 응답 메시지
 * @param {string|null} code - 에러 코드 또는 성공 코드
 * @param {object|null} DATA - 응답 데이터
 * @param {object|null} meta - 메타데이터 (페이징 정보 등)
 * @returns {object} Lambda 응답 객체
 */
const createResponse = (statusCode, message, code = null, DATA = null, meta = null) => {
  const responseBody = {
    isSuccess: statusCode >= 200 && statusCode < 300,
    statusCode: statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...(DATA && { DATA }),
    ...(meta && { meta })
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(responseBody)
  };
};

/**
 * 성공 응답 생성 함수
 * @param {string} message - 성공 메시지
 * @param {object|null} DATA - 응답 데이터
 * @param {string|null} successCode - 성공 코드
 * @param {number} statusCode - HTTP 상태 코드 (기본: 200)
 * @returns {object} Lambda 응답 객체
 */
const createSuccessResponse = (message, DATA = null, successCode = null, statusCode = HTTP_STATUS.OK) => {
  return createResponse(statusCode, message, successCode, DATA);
};

/**
 * 에러 응답 생성 함수
 * @param {string} message - 에러 메시지
 * @param {string} errorCode - 에러 코드
 * @param {number} statusCode - HTTP 상태 코드 (기본: 500)
 * @returns {object} Lambda 응답 객체
 */
const createErrorResponse = (message, errorCode, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
  return createResponse(statusCode, message, errorCode);
};

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  SUCCESS_CODES,
  createResponse,
  createSuccessResponse,
  createErrorResponse
};
