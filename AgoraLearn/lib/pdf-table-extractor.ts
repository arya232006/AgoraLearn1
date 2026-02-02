import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface TableCell {
    value: string;
    rowIndex: number;
    colIndex: number;
    isEmpty: boolean;
}

export interface ExtractedTable {
    id: string;
    title?: string;
    headers: string[];
    rows: string[][];
    pageNumber?: number;
    isFilled: boolean;
    completeness: number;
    rawText?: string;
}

export interface PDFTableExtractionResult {
    tables: ExtractedTable[];
    totalPages: number;
    hasTabularData: boolean;
}

/**
 * Extract tables from PDF using text-based parsing
 * This is a fallback method when Vision API is not available
 */
async function extractTablesFromText(pdfText: string): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];

    // Split by common table markers
    const sections = pdfText.split(/\n\n+/);

    let tableId = 0;
    for (const section of sections) {
        const lines = section.trim().split('\n');
        if (lines.length < 2) continue;

        // Check if this looks like a table (has consistent delimiters)
        const hasTableStructure = lines.some(line =>
            line.includes('|') ||
            line.includes('\t') ||
            /\s{3,}/.test(line) // Multiple spaces indicating columns
        );

        if (!hasTableStructure) continue;

        // Try to parse as table
        const parsedRows: string[][] = [];

        // Detect delimiter type
        let useRegexSplit = false;
        let delimiter = '|';

        if (lines[0].includes('|')) {
            delimiter = '|';
        } else if (lines[0].includes('\t')) {
            delimiter = '\t';
        } else {
            useRegexSplit = true; // Use regex for multiple spaces
        }

        for (const line of lines) {
            if (line.trim() === '' || /^[-=+\s]+$/.test(line)) continue; // Skip separator lines

            const cells = useRegexSplit
                ? line.split(/\s{2,}/).map(c => c.trim()).filter(c => c !== '')
                : line.split(delimiter).map(c => c.trim()).filter(c => c !== '');

            if (cells.length > 1) {
                parsedRows.push(cells);
            }
        }

        if (parsedRows.length >= 2) {
            const headers = parsedRows[0];
            const dataRows = parsedRows.slice(1);

            const table: ExtractedTable = {
                id: `table-${tableId++}`,
                headers,
                rows: dataRows,
                isFilled: false,
                completeness: 0,
                rawText: section
            };

            // Calculate if filled
            const { isFilled, completeness } = calculateTableCompleteness(table);
            table.isFilled = isFilled;
            table.completeness = completeness;

            tables.push(table);
        }
    }

    return tables;
}

/**
 * Use Gemini Vision API to extract tables from PDF pages
 * This is more accurate for complex table layouts
 */
async function extractTablesWithVision(pdfBuffer: Buffer): Promise<ExtractedTable[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Convert PDF buffer to base64
        const base64Pdf = pdfBuffer.toString('base64');

        const prompt = `
      Analyze this PDF document and extract ALL tables present in it.
      
      For each table found:
      1. Identify the table title or caption (if any)
      2. Extract column headers
      3. Extract all data rows
      4. Determine if the table contains actual data or is empty/placeholder
      
      Return a JSON array of tables with this structure:
      [
        {
          "title": "Table title or description",
          "headers": ["Column 1", "Column 2", ...],
          "rows": [
            ["value1", "value2", ...],
            ["value3", "value4", ...]
          ],
          "pageNumber": 1
        }
      ]
      
      IMPORTANT:
      - If a cell is empty, use an empty string ""
      - If a cell has placeholder text like "...", "___", "N/A", keep it as-is
      - Preserve numeric values exactly as shown
      - If no tables are found, return an empty array []
      
      Return ONLY the JSON array, no markdown formatting.
    `;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: base64Pdf
                }
            },
            { text: prompt }
        ]);

        const response = await result.response;
        let text = response.text().trim();

        // Clean markdown if present
        if (text.startsWith("```json")) text = text.replace(/```json/g, "").replace(/```/g, "");
        if (text.startsWith("```")) text = text.replace(/```/g, "");

        const tablesData = JSON.parse(text);

        // Convert to ExtractedTable format
        const tables: ExtractedTable[] = tablesData.map((t: any, idx: number) => {
            const table: ExtractedTable = {
                id: `table-${idx}`,
                title: t.title,
                headers: t.headers || [],
                rows: t.rows || [],
                pageNumber: t.pageNumber,
                isFilled: false,
                completeness: 0
            };

            const { isFilled, completeness } = calculateTableCompleteness(table);
            table.isFilled = isFilled;
            table.completeness = completeness;

            return table;
        });

        return tables;
    } catch (error) {
        console.error("Vision API extraction failed:", error);
        throw error;
    }
}

/**
 * Calculate table completeness and determine if it's filled
 */
function calculateTableCompleteness(table: ExtractedTable): { isFilled: boolean; completeness: number } {
    if (table.rows.length === 0) {
        return { isFilled: false, completeness: 0 };
    }

    let totalCells = 0;
    let filledCells = 0;

    for (const row of table.rows) {
        for (const cell of row) {
            totalCells++;

            const cellValue = String(cell).trim();

            // Check if cell is truly filled (not empty, not placeholder)
            const isEmpty =
                cellValue === '' ||
                cellValue === '...' ||
                cellValue === '___' ||
                cellValue === 'N/A' ||
                cellValue === 'n/a' ||
                cellValue === '-' ||
                /^_+$/.test(cellValue) ||
                /^\.+$/.test(cellValue);

            if (!isEmpty) {
                filledCells++;
            }
        }
    }

    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    const isFilled = completeness >= 50; // Consider filled if at least 50% of cells have data

    return { isFilled, completeness };
}

/**
 * Main function to extract tables from PDF
 * Tries Vision API first, falls back to text-based extraction
 */
export async function extractTablesFromPDF(
    pdfBuffer: Buffer,
    useVision: boolean = true
): Promise<PDFTableExtractionResult> {
    let tables: ExtractedTable[] = [];

    // Try Vision API first if enabled
    if (useVision && process.env.GEMINI_API_KEY) {
        try {
            console.log("[PDF Table Extractor] Using Vision API for table extraction");
            tables = await extractTablesWithVision(pdfBuffer);
            console.log(`[PDF Table Extractor] Vision API extracted ${tables.length} tables`);
        } catch (error) {
            console.warn("[PDF Table Extractor] Vision API failed, falling back to text extraction:", error);
        }
    }

    // Fallback to text-based extraction if Vision failed or disabled
    if (tables.length === 0) {
        try {
            console.log("[PDF Table Extractor] Using text-based extraction");
            const pdfParse = await import('pdf-parse');
            const pdfData = await (pdfParse as any).default(pdfBuffer);
            const pdfText = pdfData.text;

            tables = await extractTablesFromText(pdfText);
            console.log(`[PDF Table Extractor] Text extraction found ${tables.length} tables`);

            return {
                tables,
                totalPages: pdfData.numpages,
                hasTabularData: tables.length > 0
            };
        } catch (error) {
            console.error("[PDF Table Extractor] Text extraction failed:", error);
            throw new Error("Failed to extract tables from PDF");
        }
    }

    return {
        tables,
        totalPages: 0, // Vision API doesn't provide page count easily
        hasTabularData: tables.length > 0
    };
}

/**
 * Analyze a specific table and provide detailed insights
 */
export function analyzeTable(table: ExtractedTable): {
    expectedDataTypes: Record<string, string>;
    missingFields: string[];
    suggestions: string[];
} {
    const expectedDataTypes: Record<string, string> = {};
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    // Analyze headers to determine expected data types
    for (const header of table.headers) {
        const lowerHeader = header.toLowerCase();

        if (lowerHeader.includes('s.no') || lowerHeader.includes('serial') || lowerHeader.includes('no.')) {
            expectedDataTypes[header] = 'number';
        } else if (lowerHeader.includes('voltage') || lowerHeader.includes('current') ||
            lowerHeader.includes('resistance') || lowerHeader.includes('reading')) {
            expectedDataTypes[header] = 'number';
            if (!table.isFilled) {
                missingFields.push(header);
            }
        } else if (lowerHeader.includes('observation') || lowerHeader.includes('remark')) {
            expectedDataTypes[header] = 'text';
        } else {
            expectedDataTypes[header] = 'any';
        }
    }

    // Generate suggestions
    if (!table.isFilled) {
        suggestions.push(`This table appears to be empty or incomplete (${table.completeness.toFixed(1)}% filled).`);
        suggestions.push(`Please fill in the experimental data for: ${missingFields.join(', ')}`);
    }

    if (table.rows.length < 3) {
        suggestions.push("Consider taking more readings for better accuracy (at least 5-7 data points recommended).");
    }

    return {
        expectedDataTypes,
        missingFields,
        suggestions
    };
}
