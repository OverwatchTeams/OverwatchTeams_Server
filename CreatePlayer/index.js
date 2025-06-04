const connectToDatabase = require('./db');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();

  let player;
  try {
    player = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '요청 body가 올바른 JSON 형식이 아닙니다.' }),
    };
  }

  const requiredFields = ['player', 'scores'];
  for (const field of requiredFields) {
    if (player[field] === undefined || player[field] === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `${field} 필드는 필수입니다.` }),
      };
    }
  }

  try {
    const insertedPlayer = new Player(player);
    await insertedPlayer.save();
    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Player saved successfully', playerId: insertedPlayer._id }),
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
      body: JSON.stringify({ message: 'Failed to save Player', error: err.message }),
    };
  }
};