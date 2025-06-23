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
    // 플레이어 업데이트
    const updatedPlayer = await Player.findOneAndUpdate(
      { player: player.player }, // 조건: player 필드가 동일한 경우
      player, // 업데이트할 데이터
      { new: true, upsert: true, runValidators: true } // 옵션: 없으면 생성, 유효성 검사 실행
    );

    // subNames에 포함된 이름과 동일한 player 데이터를 삭제
    if (updatedPlayer.subNames && updatedPlayer.subNames.length > 0) {
      await Player.deleteMany({ player: { $in: updatedPlayer.subNames } });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Player updated successfully', playerId: updatedPlayer._id }),
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
      body: JSON.stringify({ message: 'Failed to update Player', error: err.message }),
    };
  }
};