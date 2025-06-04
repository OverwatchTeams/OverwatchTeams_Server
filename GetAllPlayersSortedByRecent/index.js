const connectToDatabase = require('./db');
const Player = require('./models/Player');

async function getPlayers() {
  try {
    // isClanMember가 true인 플레이어를 dates.last 기준으로 최신순 정렬
    // player와 scores 필드만 선택
    const players = await Player.find({ isClanMember: true })
      .sort({ 'dates.LastRound': -1 })
      .select('player scores');

    return players;
  } catch (err) {
    console.error('Error fetching players:', err);
    throw err;
  }
}

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const players = await getPlayers();

    return {
      statusCode: 200,
      body: JSON.stringify(players),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get Player data', error: err.message }),
    };
  }
};