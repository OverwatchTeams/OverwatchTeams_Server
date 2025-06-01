const mongoose = require('mongoose');

// 승률 상세 구조
const totalWinRateSchema = new mongoose.Schema({
  ranking: { type: Number, default: 0 },    // 순위
  winRate: { type: Number, default: 0 },     // 승률
  wins: { type: Number, default: 0 },        // 승리횟수
  losses: { type: Number, default: 0 },      // 패배횟수
  isMinRequired: { type: Boolean, default: false }// 최소 경기수 충족 여부(추가)
}, { _id: false });

// 승률 상세 구조
const simpleWinRateSchema = new mongoose.Schema({
  winRate: { type: Number, default: 0 },     // 승률
  wins: { type: Number, default: 0 },        // 승리횟수
  losses: { type: Number, default: 0 },      // 패배횟수
}, { _id: false });

// 역할별 구조 (D, T, H)
const winRateRoleSchema = new mongoose.Schema({
  D: { type: simpleWinRateSchema, default: () => ({}) },
  T: { type: simpleWinRateSchema, default: () => ({}) },
  H: { type: simpleWinRateSchema, default: () => ({}) }
}, { _id: false });

// 맵별 구조 (맵 이름이 key)
const winRateMapSchema = new mongoose.Schema({}, { _id: false, strict: false });

// 역할-맵별 구조 (맵 이름이 key, value는 역할별 구조)
const winRateRoleMapSchema = new mongoose.Schema({
  D: { type: winRateMapSchema, default: () => ({}) },
  T: { type: winRateMapSchema, default: () => ({}) },
  H: { type: winRateMapSchema, default: () => ({}) }
}, { _id: false });

// 승률 전체 구조
const winRateSchema = new mongoose.Schema({
  total: { type: totalWinRateSchema, default: () => ({}) }, // 플레이어별
  role: { type: winRateRoleSchema, default: () => ({}) }, // 역할별
  map: { type: winRateMapSchema, default: () => ({}) }, // 맵별
  roleMap: { type: winRateRoleMapSchema, default: () => ({}) } // 역할-맵별
}, { _id: false });

// 출석 상세 구조
const attendanceDetailSchema = new mongoose.Schema({
  ranking: { type: Number, default: 0 },    // 순위
  playedGames: { type: Number, default: 0 }, // 참여 경기 수
  totalGames: { type: Number, default: 0 }, // 전체 경기 수
  isMinRequired: { type: Boolean, default: false } // 최소 경기수 충족 여부
}, { _id: false });

// 리더보드 구조
const leaderBoardSchema = new mongoose.Schema({
  winRate: { type: winRateSchema, default: () => ({}) },
  attendance: { type: attendanceDetailSchema, default: () => ({}) }
}, { _id: false });

// 게임 데이터 구조
const gameDatasSchema = new mongoose.Schema({
  totalGames: Number,
  map: { type: winRateMapSchema, default: () => ({}) },
  minRequiredRound: Number
}, { _id: false });

// Main 스키마
const mainSchema = new mongoose.Schema({
  updateDate: { type: Date },
  leaderBoard: {
    byYear: { type: Map, of: leaderBoardSchema, default: {} },
    byMonth: { type: Map, of: leaderBoardSchema, default: {} }
  },
  gameDatas: {
    byYear: { type: Map, of: gameDatasSchema, default: {} },
    byMonth: { type: Map, of: gameDatasSchema, default: {} }
  }
});

module.exports = mongoose.model('Main', mainSchema);