const mongoose = require('mongoose');
const connectToDatabase = require('./db');
const Match = require('./models/Match');
const Player = require('./models/Player');

exports.handler = async (event) => {
  await connectToDatabase();
  try {
  
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'All player data updated successfully.' }),
    };

  } catch (error) {
    console.error('Update failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating player data.', error }),
    };
  }
};
