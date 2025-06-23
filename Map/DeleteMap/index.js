const connectToDatabase = require('./db');
const Map = require('./models/Map');

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
    const deleted = await Map.findByIdAndDelete(id);
    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Map not found' }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Map deleted successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to delete Map', error: err.message }),
    };
  }
};