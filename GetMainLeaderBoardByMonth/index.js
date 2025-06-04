const connectToDatabase = require('./db');
const Main = require('./models/Main');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const month = event.queryStringParameters?.month;

    if (!month) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Month parameter is required (e.g., 2025-05)' }),
      };
    }

    const result = await Main.findOne(
      { [`leaderBoard.byMonth.${month}`]: { $exists: true } },
      { [`leaderBoard.byMonth.${month}`]: 1, _id: 0 }
    );

    if (!result || !result.leaderBoard?.byMonth) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for month ${month}` }),
      };
    }

    // Map 타입 처리
    const monthData =
      result.leaderBoard.byMonth instanceof Map
        ? result.leaderBoard.byMonth.get(month)
        : result.leaderBoard.byMonth[month];

    if (!monthData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for month ${month}` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(monthData),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get LeaderBoard', error: err.message }),
    };
  }
};