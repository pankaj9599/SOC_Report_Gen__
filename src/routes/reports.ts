import { Router } from 'express';
import Report from '../models/Report.model';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();
const reportsDir = path.join(process.cwd(), 'src/reports');

if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

router.post('/generate', async (req, res) => {
  const { executionId, findings } = req.body;
  if (!executionId || !Array.isArray(findings)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const doc = new PDFDocument();
  const fileName = `report-${executionId}.pdf`;
  const filePath = path.join(reportsDir, fileName);
  doc.pipe(fs.createWriteStream(filePath));
  doc.text(`SOC Report: ${executionId}`);
  findings.forEach((f: any, i: number) => {
    doc.text(`\n${i + 1}. ${f.title} [${f.severity}]`);
  });
  doc.end();

  const report = await Report.create({
    executionId,
    inputFindings: findings,
    summary: { total: findings.length },
    pdfPath: filePath,
    pdfUrl: `/api/reports/download/${fileName}`,
    status: 'COMPLETED',
    generatedAt: new Date()
  });

  res.json({ success: true, report });
});

router.get('/download/:file', (req, res) => {
  res.download(path.join(reportsDir, req.params.file));
});

export default router;