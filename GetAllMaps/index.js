const connectToDatabase = require('./db');
const Map = require('./models/Map');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const maps = await Map.find().sort({ index: 1 });

    return {
      statusCode: 200,
      body: JSON.stringify(maps),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get Map data', error: err.message }),
    };
  }
};