const connectToDatabase = require('./db');
const Map = require('./models/Map');

exports.handler = async (event) => {
  await connectToDatabase();

  let map;
  try {
    map = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '요청 body가 올바른 JSON 형식이 아닙니다.' }),
    };
  }

  const requiredFields = ['index', 'name', 'type'];
  for (const field of requiredFields) {
    if (map[field] === undefined || map[field] === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `${field} 필드는 필수입니다.` }),
      };
    }
  }

  try {
    const insertedMap = new Map(map);
    await insertedMap.save();
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Map saved successfully', mapId: insertedMap._id }),
    };
  } catch (err) {
    if (err.name === 'ValidationError') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: '유효하지 않은 데이터입니다.' }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save map', error: err.message }),
    };
  }
};