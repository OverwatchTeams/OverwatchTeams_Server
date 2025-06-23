const connectToDatabase = require('./db');
const Main = require('./models/Main');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const result = await Main.findOne({}, { gameDatas: 1, _id: 0 });

    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No GameDatas found' }),
      };
    }

    // Extract and sort byYear keys
    const year = Array.from(result.gameDatas.byYear.keys())
      .sort((a, b) => b - a);

    // Extract and sort byMonth keys
    const month = Array.from(result.gameDatas.byMonth.keys())
      .sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        return yearB - yearA || monthB - monthA;
      });

    return {
      statusCode: 200,
      body: JSON.stringify({ year, month }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get GameDatas', error: err.message }),
    };
  }
};