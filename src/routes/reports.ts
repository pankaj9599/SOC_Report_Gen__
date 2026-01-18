import { Router, Request, Response } from 'express';
import Report from '../models/Report.model';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * IMPORTANT:
 * Serverless platforms allow writing ONLY to /tmp
 */
const reportsDir = '/tmp/reports';

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * POST /api/reports/generate
 * Generates SOC report PDF
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { executionId, findings } = req.body;

    // Basic validation
    if (!executionId || !Array.isArray(findings) || findings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'executionId and findings[] are required'
      });
    }

    const fileName = `report-${executionId}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // PDF content
    doc.fontSize(18).text(`SOC Security Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Execution ID: ${executionId}`);
    doc.moveDown();

    findings.forEach((f: any, index: number) => {
      doc
        .fontSize(12)
        .text(`${index + 1}. ${f.title || 'Untitled Finding'}`);
      doc.fontSize(10).text(`Severity: ${f.severity || 'MEDIUM'}`);
      doc.fontSize(10).text(`Description: ${f.description || 'N/A'}`);
      doc.fontSize(10).text(`Recommendation: ${f.recommendation || 'N/A'}`);
      doc.moveDown();
    });

    doc.end();

    /**
     * VERY IMPORTANT:
     * Wait until PDF is fully written before DB insert & response
     */
    stream.on('finish', async () => {
      const report = await Report.create({
        executionId,
        inputFindings: findings,
        summary: {
          total: findings.length
        },
        pdfPath: filePath,
        pdfUrl: `/api/reports/download/${fileName}`,
        status: 'COMPLETED',
        generatedAt: new Date()
      });

      return res.json({
        success: true,
        message: 'Report generated successfully',
        report
      });
    });

    stream.on('error', (err) => {
      console.error('❌ PDF write error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate PDF'
      });
    });

  } catch (error: any) {
    console.error('❌ Report generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/download/:file
 * Download generated PDF
 */
router.get('/download/:file', (req: Request, res: Response) => {
  const filePath = path.join(reportsDir, req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Report file not found'
    });
  }

  res.download(filePath);
});

export default router;
