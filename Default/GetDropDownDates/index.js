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
    // Get all unique dates from Match collection
    const matches = await Match.find({}, { date: 1, _id: 0 });

    if (!matches || matches.length === 0) {
      return createErrorResponse('매치 데이터가 존재하지 않습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Extract unique years and sort descending
    const yearSet = new Set();
    const monthSet = new Set();
    const daySet = new Set();

    matches.forEach(match => {
      const date = new Date(match.date);
      const year = date.getFullYear();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      yearSet.add(year);
      monthSet.add(month);
      daySet.add(day);
    });

    // Convert sets to arrays and sort
    const year = Array.from(yearSet).sort((a, b) => b - a);
    
    const month = Array.from(monthSet).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearB - yearA || monthB - monthA;
    });

    const day = Array.from(daySet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });

    return createSuccessResponse('경기 날짜 데이터를 조회하였습니다.', { year, month, day }, SUCCESS_CODES.DATA_RETRIEVED, HTTP_STATUS.OK);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};