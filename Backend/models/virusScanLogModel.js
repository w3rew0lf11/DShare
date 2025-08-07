// models/File.js
import mongoose from 'mongoose'

const virusScanLogSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
    },
    username: {
      type: String,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    virusScan: {
      fileStatus: {
        type: String,
        enum: ['CLEAN', 'SUSPICIOUS', 'MALICIOUS', 'TIMEOUT'],
        default: 'CLEAN',
      },
      summary: {
        malicious: { type: Number, default: 0 },
        suspicious: { type: Number, default: 0 },
        undetected: { type: Number, default: 0 },
        harmless: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
)

export default mongoose.model('VirusScanLog', virusScanLogSchema)