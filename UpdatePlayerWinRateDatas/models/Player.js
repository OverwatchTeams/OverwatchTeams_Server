const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  player: {
    type: String,
    required: true,
    unique: true,
  },
  //현재 멤버인지 여부
  isClanMember: {
    type: Boolean,
    default: true,
  },
  dates: {
    // 첫 참가 날짜
    first: { type: Date, default: null },
    // 마지막 참가 날짜
    last: { type: Date, default: null },
  }, 
  //플레이어 역할별 점수
  scores: {
    //딜러 점수
    D: { type: Number, default: 0 },
    //탱커 점수
    T: { type: Number, default: 0 },
    //힐러 점수
    H: { type: Number, default: 0 }
  },
  //라운드 관련
  roundsCount: {
    //플레이어가 플레이한 총 라운드
    playByYear: {
      type: Map,
      of: Number,
      default: {}
    },
    playByMonth: {
      type: Map,
      of: Number,
      default: {}
    },
    requiredByYear: { 
      type: Map, 
      of: Number, 
      default: {} 
    }, 
    // 최소 규정 라운드 수
    requiredByMonth: { 
      type: Map, 
      of: Number, 
      default: {} 
    },
    //모든 라운드 수
    totalbyYear:{
      type: Map,
      of: Number,
      default: {} 
    },
    totalbyMonth:{
      type: Map,
      of: Number,
      default: {} 
    }
  },
   // 승률 관련 데이터
  winRates: {
    // 전체 승률
    total: {
      // 연간 승률
      byYear: {
        type: Map,
        of: Number,
        default: {}
      },
      // 월간 승률
      byMonth: {
        type: Map,
        of: Number,
        default: {}
      }
    },
    // 맵별 승률
    map: {
      type: Map,
      of: new mongoose.Schema({
        byYear: {
          type: Map,
          of: Number,
          default: {}
        },
        byMonth: {
          type: Map,
          of: Number,
          default: {}
        }
      }, { _id: false }),
      default: {}
    },
    // 역할별 승률
    role: {
      type: Map,
      of: new mongoose.Schema({
        byYear: {
          type: Map,
          of: Number,
          default: {}
        },
        byMonth: {
          type: Map,
          of: Number,
          default: {}
        }
      }, { _id: false }),
      default: {}
    }
  },
  // 시너지 플레이어 ID와 점수 Map
  synergy: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);