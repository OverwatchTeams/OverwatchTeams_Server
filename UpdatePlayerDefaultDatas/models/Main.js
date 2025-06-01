const mongoose = require('mongoose');

const winRateDetailSchema = new mongoose.Schema({
  ranking: Number,
    winRate: Number,
  wins: Number,
  losses: Number
}, { _id: false });

const attendanceDetailSchema = new mongoose.Schema({
  ranking: Number,
  playedGames: Number,
  totalGames: Number,
  minRequiredGames: Number,
  minRequired: Boolean
}, { _id: false });

// <플레이어이름,winRateDetail> 
const winRateRoleSchema = {
  D: { type: Map, of: winRateDetailSchema },
  T: { type: Map, of: winRateDetailSchema },
  H: { type: Map, of: winRateDetailSchema }
};


// <맵이름, winRateMap>
const winRateRoleMapSchema ={
    D: { type: Map, of: winRateMapSchema },
    T: { type: Map, of: winRateMapSchema },
    H: { type: Map, of: winRateMapSchema }
};

// <플레이어이름,winRateDetail> 
const winRateMapSchema ={
    type: Map,
    of: winRateDetailSchema
}

const winRateSchema = {
  // <플레이어이름,winRateDetail> 
  total: { type: Map, of: winRateDetailSchema },
  // <역할,winRateRole> 
  role: {type: Map, of: winRateRoleSchema},
  // <맵이름, winRateMap>
  map: { type: Map, of: winRateMapSchema},
  // <맵이름, winRateRoleMap>
  roleMap: {type: Map, of: winRateRoleMapSchema},
};

const leaderBoardSchema = {
  winRate: winRateSchema,
  attendance: { type: Map, of: attendanceDetailSchema }
};

const mainSchema = new mongoose.Schema({
  updateDate: { type: Date, default: Date.now },
  leaderBoard: {
    byYear: leaderBoardSchema,
    byMonth: leaderBoardSchema
  },
  gameDatas: {
    map: {
      year: { type: Map, of: Number },
      month: { type: Map, of: Number }
    },
    round: {
      year: Number,
      month: Number
    },
    minRequiredRound: {
      year: Number,
      month: Number
    }
  }
});

module.exports = mongoose.model('Main', mainSchema);