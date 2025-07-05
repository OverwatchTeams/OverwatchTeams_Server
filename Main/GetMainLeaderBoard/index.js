const connectToDatabase = require('./db');
const Main = require('./models/Main');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const category = event.queryStringParameters?.category;
    const date = event.queryStringParameters?.date;

    if (!date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'date parameter is required' }),
      };
    }

    if (!category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Category parameter is required' }),
      };
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
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid category. Must be year, month, or day' }),
      };
    }

    const result = await Main.findOne(
      { [`${leaderBoardPath}.${date}`]: { $exists: true } },
      { [`${leaderBoardPath}.${date}`]: 1, _id: 0 }
    );

    if (!result || !result.leaderBoard) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for ${category} ${date}` }),
      };
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

    if (!leaderBoardData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No ${category} data found` }),
      };
    }

    // Map 타입 처리
    const dateData =
      leaderBoardData instanceof Map
        ? leaderBoardData.get(date)
        : leaderBoardData[date];

    if (!dateData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for ${category} ${date}` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(dateData),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get LeaderBoard', error: err.message }),
    };
  }
};