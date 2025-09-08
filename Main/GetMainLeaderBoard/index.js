const connectToDatabase = require('./db');
const Main = require('./models/Main');
const { HTTP_STATUS, ERROR_CODES, SUCCESS_CODES,createSuccessResponse,createErrorResponse } = require('./utils/responseHelper');

exports.handler = async (event) => {
    try {
      await connectToDatabase();
    } catch (err) {
      return createErrorResponse('데이터베이스 연결에 실패했습니다.', ERROR_CODES.DATABASE_CONNECTION_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

  try {
    const category = event.queryStringParameters?.category;
    const date = event.queryStringParameters?.date;
    if (!date) {
      return createErrorResponse('날짜를 입력하여야 합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }

    if (!category) {
      return createErrorResponse('카테고리를 입력하여야 합니다.', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }

    // category 값에 따라 leaderBoard 속성 결정
    let leaderBoardPath;
    if (category === 'year') {
      leaderBoardPath = 'leaderBoard.byYear';
    } else if (category === 'month') {
      leaderBoardPath = 'leaderBoard.byMonth';
    } else if (category === 'day') {
      leaderBoardPath = 'leaderBoard.byDay';
    } else {
      return createErrorResponse('정확한 카테고리를 입력해야합니다.(year, month, day)', ERROR_CODES.MISSING_REQUIRED_FIELD, HTTP_STATUS.BAD_REQUEST);
    }

    const result = await Main.findOne(
      { [`${leaderBoardPath}.${date}`]: { $exists: true } },
      { [`${leaderBoardPath}.${date}`]: 1, _id: 0 }
    );

    if (!result || !result.leaderBoard) {
      return createErrorResponse('리더보드 데이터가 존재하지 않습니다.', ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // category에 따라 적절한 leaderBoard 데이터 선택
    let leaderBoardData;
    if (category === 'year') {
      leaderBoardData = result.leaderBoard.byYear;
    } else if (category === 'month') {
      leaderBoardData = result.leaderBoard.byMonth;
    } else if (category === 'day') {
      leaderBoardData = result.leaderBoard.byDay;
    }

    // Map 타입 처리
    const dateData =
      leaderBoardData instanceof Map
        ? leaderBoardData.get(date)
        : leaderBoardData[date];

    if (!dateData) {
      return createErrorResponse(`${category} ${date}인 게임 데이터가 존재하지 않습니다.`, ERROR_CODES.DATA_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse('리더보드 데이터 조회를 성공하였습니다.', dateData, SUCCESS_CODES.DATA_RETRIEVED, HTTP_STATUS.OK);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return createErrorResponse('유효하지 않은 데이터입니다.', ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    }
    return createErrorResponse('서버 내부에 예상치 못한 오류가 발생했습니다.', ERROR_CODES.DATABASE_OPERATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};