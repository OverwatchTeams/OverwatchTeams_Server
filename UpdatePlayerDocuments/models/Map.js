const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema(
{
  index: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },

}, {timestamps: true});

module.exports = mongoose.model('Map', mapSchema);