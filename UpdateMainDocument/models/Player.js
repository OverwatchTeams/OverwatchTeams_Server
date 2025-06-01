const mongoose = require('mongoose');

// 시너지 스키마는 그대로 유지
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
  synergy: { type: Map, of: synergySchema, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);