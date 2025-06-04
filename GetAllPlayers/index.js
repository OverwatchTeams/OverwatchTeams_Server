const connectToDatabase = require('./db');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    const players = await Player.find({ isClanMember: true }).sort({ index: 1 });

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