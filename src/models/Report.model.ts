import { Schema, model } from 'mongoose';

const ReportSchema = new Schema({
  executionId: { type: String, unique: true },
  inputFindings: Schema.Types.Mixed,
  summary: Schema.Types.Mixed,
  pdfUrl: String,
  pdfPath: String,
  fileSize: String,
  status: { type: String, default: 'PROCESSING' },
  generatedAt: Date
}, { timestamps: true });

export default model('Report', ReportSchema);