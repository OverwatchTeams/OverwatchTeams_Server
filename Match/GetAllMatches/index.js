const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const page = parseInt(event.queryStringParameters?.page || "1");
    const limit = parseInt(event.queryStringParameters?.limit || "10");
    const skip = (page - 1) * limit;

        // 1. 모든 Round를 내림차순으로 distinct
    const allRounds = await Match.distinct("round");
    const sortedRounds = allRounds.sort((a, b) => b - a); // 내림차순 정렬

    // 2. 페이지에 해당하는 Round 번호 slice
    const selectedRounds = sortedRounds.slice(skip, skip + limit);

    // 3. 해당 Round들에 해당하는 Match를 가져옴
    const matches = await Match.find({ round: { $in: selectedRounds } })
      .sort({ round: -1, createdAt: 1 }) // round 기준 내림차순, 내부는 등록순
      .lean();

    return {
      statusCode: 200,
      body: JSON.stringify(matches),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch match data', error: err.message }),
    };
  }
};