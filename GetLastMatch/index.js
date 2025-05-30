const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async () => {
  await connectToDatabase();

  try {
    const latestMatch = await Match.findOne({})
      .sort({ index: -1 }) // 최신순
      .lean(); // JSON 변환 최적화

    return {
      statusCode: 200,
      body: JSON.stringify(latestMatch || {}), // null 방지
    };
  } catch (err) {
    console.error("Failed to fetch latest match:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch latest match', error: err.message }),
    };
  }
};