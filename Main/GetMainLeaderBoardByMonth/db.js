const mongoose = require('mongoose');

let isConnected;

module.exports = async () => {
  if (isConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  isConnected = true;
};