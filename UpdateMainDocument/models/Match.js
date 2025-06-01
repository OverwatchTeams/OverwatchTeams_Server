const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
{
  index: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  round: {
    type: Number,
    required: true,
  },
  map: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['D', 'T', 'H'],
  },
  player: {
    type: String,
    required: true,
  },
  atkdef: {
    type: String,
    required: true,
    enum: ['선공', '후공', '중립'],
  },
  winlose: {
    type: String,
    required: true,
    enum: ['승', '패', '무'],
  },

}, {timestamps: true});

module.exports = mongoose.model('Match', matchSchema);