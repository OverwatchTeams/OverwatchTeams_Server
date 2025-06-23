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
      { [`gameDatas.byYear.${year}`]: { $exists: true } },
      { [`gameDatas.byYear.${year}`]: 1, _id: 0 }
    );

    if (!result || !result.gameDatas?.byYear) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for year ${year}` }),
      };
    }

    // Map 타입 처리
    const yearData =
      result.gameDatas.byYear instanceof Map
        ? result.gameDatas.byYear.get(year)
        : result.gameDatas.byYear[year];

    if (!yearData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `No data found for year ${year}` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(yearData),
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get GameDatas', error: err.message }),
    };
  }
};