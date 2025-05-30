const connectToDatabase = require('./db');
const MapType = require('./models/MapType');

exports.handler = async (event) => {
  await connectToDatabase();

  // API Gateway에서 id는 pathParameters로 전달됨
  const { id } = event.queryStringParameters || {};

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'id 파라미터가 필요합니다.' }),
    };
  }

  try {
    const deleted = await MapType.findByIdAndDelete(id);
    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'MapType not found' }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'MapType deleted successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to delete MapType', error: err.message }),
    };
  }
};