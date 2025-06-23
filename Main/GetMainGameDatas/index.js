const connectToDatabase = require('./db');
const Main = require('./models/Main');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const result = await Main.find({}, { gameDatas: 1, _id: 0 });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get GameDatas', error: err.message }),
    };
  }
};