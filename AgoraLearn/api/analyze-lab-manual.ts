import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractTablesFromPDF } from '../lib/pdf-table-extractor';
import { validateTables } from '../lib/table-validator';
import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

/**
 * API endpoint to analyze cached lab manual PDFs
 * Extracts tables, validates data, and returns structured results
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const contentType = String(req.headers['content-type'] || '').toLowerCase();

        // Expect JSON with docId
        if (!contentType.includes('application/json')) {
            return res.status(400).json({ error: 'Content-Type must be application/json' });
        }

        const body = req.body || {};
        const docId = body.docId;
        const useVision = body.useVision !== false; // Default to true

        if (!docId) {
            return res.status(400).json({ error: 'Missing docId parameter' });
        }

        console.log(`[Analyze Lab Manual] Processing docId: ${docId}`);

        // Retrieve the cached PDF
        const cacheDir = path.join(process.cwd(), '.agoralearn_cache', 'pdfs');
        const cachePath = path.join(cacheDir, `${docId}.pdf`);

        if (!fs.existsSync(cachePath)) {
            console.error('[Analyze Lab Manual] PDF not found in cache:', cachePath);
            return res.status(404).json({
                error: 'PDF not found in cache. Please re-upload the PDF.',
                docId
            });
        }

        console.log('[Analyze Lab Manual] Reading PDF from cache');
        const pdfBuffer = fs.readFileSync(cachePath);

        // Extract tables from PDF
        console.log('[Analyze Lab Manual] Extracting tables...');
        const extractionResult = await extractTablesFromPDF(pdfBuffer, useVision);

        console.log(`[Analyze Lab Manual] Found ${extractionResult.tables.length} tables`);

        // Validate tables
        const validationResult = validateTables(extractionResult.tables);

        // Cache the analysis results
        const analysisDir = path.join(process.cwd(), '.agoralearn_cache', 'analysis');
        try { fs.mkdirSync(analysisDir, { recursive: true }); } catch (e) { }
        const analysisPath = path.join(analysisDir, `${docId}.json`);

        const analysisData = {
            docId,
            tables: extractionResult.tables,
            validation: validationResult,
            analyzedAt: new Date().toISOString()
        };

        try {
            fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2), 'utf8');
            console.log('[Analyze Lab Manual] Analysis cached');
        } catch (e) {
            console.warn('[Analyze Lab Manual] Failed to cache analysis:', e);
        }

        // Return structured response
        return res.status(200).json({
            ok: true,
            docId,
            tables: extractionResult.tables.map(t => ({
                id: t.id,
                title: t.title,
                headers: t.headers,
                rowCount: t.rows.length,
                isFilled: t.isFilled,
                completeness: t.completeness,
                pageNumber: t.pageNumber
            })),
            validation: {
                allValid: validationResult.allValid,
                allFilled: validationResult.allFilled,
                canProceed: validationResult.canProceed,
                overallPrompt: validationResult.overallPrompt,
                tableValidations: validationResult.validationResults.map((v, idx) => ({
                    tableId: extractionResult.tables[idx].id,
                    isFilled: v.isFilled,
                    completeness: v.completeness,
                    missingFields: v.missingFields,
                    dataQualityIssues: v.dataQualityIssues,
                    userPrompt: v.userPrompt,
                    canPlotGraph: v.canPlotGraph
                }))
            },
            canPlotGraph: validationResult.canProceed,
            totalPages: extractionResult.totalPages
        });

    } catch (error: any) {
        console.error('[Analyze Lab Manual] Error:', error);
        return res.status(500).json({
            error: 'Failed to analyze lab manual',
            details: error?.message || String(error)
        });
    }
}
