const connectToDatabase = require('./db');
const MapType = require('./models/MapType');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const maptypes = await MapType.find().sort({ index: 1 });

    return {
      statusCode: 200,
      body: JSON.stringify(maptypes),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get MapType data', error: err.message }),
    };
  }
};