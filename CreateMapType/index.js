const connectToDatabase = require('./db');
const MapType = require('./models/MapType');

exports.handler = async (event) => {
  await connectToDatabase();

  let maptype;
  try {
    maptype = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '요청 body가 올바른 JSON 형식이 아닙니다.' }),
    };
  }

  const requiredFields = ['index', 'name', 'isAtkDef'];
  for (const field of requiredFields) {
    if (maptype[field] === undefined || maptype[field] === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `${field} 필드는 필수입니다.` }),
      };
    }
  }

  try {
    const insertedMapType = new MapType(maptype);
    await insertedMapType.save();
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'MapType saved successfully', maptypeID: insertedMapType._id }),
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
      body: JSON.stringify({ message: 'Failed to save maptype', error: err.message }),
    };
  }
};