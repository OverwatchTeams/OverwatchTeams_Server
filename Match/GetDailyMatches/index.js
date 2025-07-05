const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    // queryStringParameters에서 date 파라미터 추출
    const { date } = event.queryStringParameters || {};
    
    if (!date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Date parameter is required (format: YYYY-MM-DD)' }),
      };
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid date format. Use YYYY-MM-DD format' }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify(matches),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch match data', error: err.message }),
    };
  }
};