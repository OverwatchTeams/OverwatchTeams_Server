const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async (event) => {
  await connectToDatabase();

  let matches;
  try {
    matches = JSON.parse(event.body); // body는 Match 객체 10개가 들어있는 배열이어야 함
    if (!Array.isArray(matches) || matches.length !== 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: '10개의 Match 데이터 배열을 전달해야 합니다.' }),
      };
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: '잘못된 JSON 형식입니다.' }),
    };
  }

  const requiredFields = ['index', 'date', 'round', 'map', 'role', 'player', 'atkdef', 'winlose'];

  // 모든 Match 데이터 검증
  for (let i = 0; i < matches.length; i++) {
    for (const field of requiredFields) {
      if (!matches[i][field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `배열 ${i}번째 데이터의 ${field} 필드는 필수입니다.` }),
        };
      }
    }
  }

  try {
    // 한번에 여러 문서 삽입
    const insertedMatches = await Match.insertMany(matches);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Matches saved successfully', insertedCount: insertedMatches.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save matches', error: err.message }),
    };
  }
};