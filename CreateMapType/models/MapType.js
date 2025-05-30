const mongoose = require('mongoose');

const maptypeSchema = new mongoose.Schema(
{
  index: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  isAtkDef: {
    type: Boolean,
    required: true,
  },

}, {timestamps: true});

module.exports = mongoose.model('MapType', maptypeSchema);