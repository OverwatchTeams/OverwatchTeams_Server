const connectToDatabase = require('./db');
const Match = require('./models/Match');

exports.handler = async (event) => {
  await connectToDatabase();

  try {
    // Get all unique dates from Match collection
    const matches = await Match.find({}, { date: 1, _id: 0 });

    if (!matches || matches.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No Match data found' }),
      };
    }

    // Extract unique years and sort descending
    const yearSet = new Set();
    const monthSet = new Set();
    const daySet = new Set();

    matches.forEach(match => {
      const date = new Date(match.date);
      const year = date.getFullYear();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      yearSet.add(year);
      monthSet.add(month);
      daySet.add(day);
    });

    // Convert sets to arrays and sort
    const year = Array.from(yearSet).sort((a, b) => b - a);
    
    const month = Array.from(monthSet).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearB - yearA || monthB - monthA;
    });

    const day = Array.from(daySet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ year, month, day }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to get Match data', error: err.message }),
    };
  }
};