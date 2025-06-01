const mongoose = require('mongoose');

// 경기수/승수/승률 구조
const winRateDetailSchema = new mongoose.Schema({
  playedGames: { type: Number, default: 0 },   // 참여 경기 수
  totalGames: { type: Number, default: 0 },    // 전체 경기 수
  requiredGames: { type: Number, default: 0 }, // 필요 경기 수
  wins: { type: Number, default: 0 },          // 이긴 횟수
  rate: { type: Number, default: 0 }           // 승률
}, { _id: false });

// 역할별 구조 (D, T, H)
const winRateRoleSchema = new mongoose.Schema({
  D: { type: winRateDetailSchema, default: () => ({}) },
  T: { type: winRateDetailSchema, default: () => ({}) },
  H: { type: winRateDetailSchema, default: () => ({}) }
}, { _id: false });

// 맵별 구조 (맵 이름이 key)
const winRateMapSchema = new mongoose.Schema({}, { _id: false, strict: false });

// 연/월별 구조
const winRateByPeriodSchema = new mongoose.Schema({
  total: { type: winRateDetailSchema, default: () => ({}) },
  map: { type: winRateMapSchema, default: () => ({}) },
  role: { type: winRateRoleSchema, default: () => ({}) }
}, { _id: false });

const synergyDetailSchema = new mongoose.Schema({
  games: { type: Number, default: 0 },      // 같이 뛴 경기 수
  score: { type: Number, default: 0 }       // 시너지 점수
}, { _id: false });

const synergyRolePairSchema = new mongoose.Schema({
  sameTeam: { type: synergyDetailSchema, default: () => ({}) },
  oppositeTeam: { type: synergyDetailSchema, default: () => ({}) }
}, { _id: false });

const synergySchema = new mongoose.Schema({
  // 역할 조합별로 시너지 정보 저장 (예: D-D, D-T, ...)
  'D-D': { type: synergyRolePairSchema, default: () => ({}) },
  'D-T': { type: synergyRolePairSchema, default: () => ({}) },
  'D-H': { type: synergyRolePairSchema, default: () => ({}) },
  'T-D': { type: synergyRolePairSchema, default: () => ({}) },
  'T-H': { type: synergyRolePairSchema, default: () => ({}) },
  'T-T': { type: synergyRolePairSchema, default: () => ({}) },
  'H-D': { type: synergyRolePairSchema, default: () => ({}) },
  'H-T': { type: synergyRolePairSchema, default: () => ({}) },
  'H-H': { type: synergyRolePairSchema, default: () => ({}) }
}, { _id: false });

const playerSchema = new mongoose.Schema({
  player: { type: String, required: true, unique: true },
  isClanMember: { type: Boolean, default: true },
  dates: {
    first: { type: Date, default: null },
    last: { type: Date, default: null }
  },
  scores: {
    D: { type: Number, default: 0 },
    T: { type: Number, default: 0 },
    H: { type: Number, default: 0 }
  },
  winRates: {
    byYear: { type: Map, of: winRateByPeriodSchema, default: {} },
    byMonth: { type: Map, of: winRateByPeriodSchema, default: {} }
  },
  synergy: { type: Map, of: synergySchema, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);