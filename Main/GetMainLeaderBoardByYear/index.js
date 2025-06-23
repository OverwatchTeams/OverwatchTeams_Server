const connectToDatabase = require('./db');
const Main = require('./models/Main');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const year = event.queryStringParameters?.year;

    if (!year) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Year parameter is required' }),
      };
    }

    const result = await Main.findOne(
      { [`leaderBoard.byYear.${year}`]: { $exists: true } },
      { [`leaderBoard.byYear.${year}`]: 1, _id: 0 }
    );

    console.log('Query Parameters:', event.queryStringParameters);
    console.log('Year:', year);
    console.log('Database Query Result:', result);

    if (!result || !result.leaderBoard?.byYear) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for year ${year}` }),
      };
    }

    // Map 타입 처리
    const yearData =
      result.leaderBoard.byYear instanceof Map
        ? result.leaderBoard.byYear.get(year)
        : result.leaderBoard.byYear[year];

    if (!yearData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for year ${year}` }),
      };
    }

    console.log('LeaderBoard Data:', yearData);

    return {
      statusCode: 200,
      body: JSON.stringify(yearData),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get LeaderBoard', error: err.message }),
    };
  }
};