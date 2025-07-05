const connectToDatabase = require('./db');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    // 쿼리 파라미터(클랜멤버 필터링, 반환 필드 필터링, 정렬 옵션)
    const name = event.queryStringParameters?.Name;

    // 데이터 조회
    let player = await Player.findOne({ player: name });

    // name이 제공되었는데 플레이어를 찾지 못한 경우
    if (name && !player) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Player with name '${name}' not found` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(player),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get Player data', error: err.message }),
    };
  }
};