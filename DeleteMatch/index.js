const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async (event) => {
  await connectToDatabase();

  // round를 pathParameters 또는 queryStringParameters에서 받아옵니다.
  const round =
    (event.pathParameters && event.pathParameters.round) ||
    (event.queryStringParameters && event.queryStringParameters.round);

  if (!round) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'round 값이 필요합니다.' }),
    };
  }

  try {
    // round는 숫자이므로 Number로 변환
    const roundNumber = Number(round);
    if (isNaN(roundNumber)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'round 값은 숫자여야 합니다.' }),
      };
    }

    const result = await Match.deleteMany({ round: roundNumber });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: '해당 round의 Match가 없습니다.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `라운드 ${roundNumber}의 Match ${result.deletedCount}개가 삭제되었습니다.`,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Match 삭제 실패', error: err.message }),
    };
  }
};