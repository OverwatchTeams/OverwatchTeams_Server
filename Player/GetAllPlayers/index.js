const connectToDatabase = require('./db');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    // 쿼리 파라미터(클랜멤버 필터링, 반환 필드 필터링, 정렬 옵션)
    const clanMember = event.queryStringParameters?.ClanMember;
    const fields = event.queryStringParameters?.Fields;
    const sort = event.queryStringParameters?.Sort;

    // 클랜 멤버 필터링
    const queryOptions = {};
    if (clanMember === 'true') {
      queryOptions.isClanMember = true;
    }

    // 반환 필드 필터링
    let projection = {};
    if (fields) {
      if (fields === 'all') {
        projection = {}; // Empty projection returns all fields
      } else {
        fields.split(',').forEach((field) => {
          projection[field.trim()] = 1; // Include specified fields
        });
      }
    }

    // 정렬 옵션
    let sortOptions = {};
    if (sort === 'recent') {
      sortOptions = { 'dates.last': -1 }; // 최신순 정렬
    } else if (sort === 'dic') {
      sortOptions = { player: 1 }; // 이름순 정렬
    }

    // 데이터 조회
    const players = await Player.find(queryOptions, projection).sort(sortOptions);

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