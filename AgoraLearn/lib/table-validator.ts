import type { ExtractedTable } from './pdf-table-extractor';

export interface TableValidationResult {
    isValid: boolean;
    isFilled: boolean;
    completeness: number;
    missingFields: string[];
    dataQualityIssues: string[];
    userPrompt: string;
    canPlotGraph: boolean;
}

/**
 * Validate if a table is filled with actual data
 */
export function isTableFilled(table: ExtractedTable): boolean {
    return table.isFilled && table.completeness >= 50;
}

/**
 * Get table completeness percentage
 */
export function getTableCompleteness(table: ExtractedTable): number {
    return table.completeness;
}

/**
 * Identify which fields are missing data
 */
export function identifyMissingFields(table: ExtractedTable): string[] {
    const missingFields: string[] = [];

    if (table.rows.length === 0) {
        return table.headers; // All fields are missing if no rows
    }

    // Check each column
    for (let colIdx = 0; colIdx < table.headers.length; colIdx++) {
        const header = table.headers[colIdx];
        let hasData = false;

        for (const row of table.rows) {
            const cellValue = String(row[colIdx] || '').trim();

            // Check if cell has actual data
            const isNotEmpty =
                cellValue !== '' &&
                cellValue !== '...' &&
                cellValue !== '___' &&
                cellValue !== 'N/A' &&
                cellValue !== 'n/a' &&
                cellValue !== '-' &&
                !/^_+$/.test(cellValue) &&
                !/^\.+$/.test(cellValue);

            if (isNotEmpty) {
                hasData = true;
                break;
            }
        }

        if (!hasData) {
            missingFields.push(header);
        }
    }

    return missingFields;
}

/**
 * Check for data quality issues
 */
export function checkDataQuality(table: ExtractedTable): string[] {
    const issues: string[] = [];

    // Check if table has enough rows
    if (table.rows.length < 3) {
        issues.push("Insufficient data points (less than 3 readings). Recommended: 5-7 readings for better accuracy.");
    }

    // Check for inconsistent row lengths
    const expectedLength = table.headers.length;
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i].length !== expectedLength) {
            issues.push(`Row ${i + 1} has ${table.rows[i].length} columns, expected ${expectedLength}.`);
        }
    }

    // Check for numeric columns that should have numbers
    for (let colIdx = 0; colIdx < table.headers.length; colIdx++) {
        const header = table.headers[colIdx].toLowerCase();

        // Skip S.No column
        if (header.includes('s.no') || header.includes('serial')) continue;

        // Check if this should be a numeric column
        const shouldBeNumeric =
            header.includes('voltage') ||
            header.includes('current') ||
            header.includes('resistance') ||
            header.includes('reading') ||
            header.includes('value') ||
            header.includes('measurement');

        if (shouldBeNumeric) {
            let hasNonNumeric = false;

            for (const row of table.rows) {
                const cellValue = String(row[colIdx] || '').trim();
                if (cellValue && isNaN(Number(cellValue))) {
                    hasNonNumeric = true;
                    break;
                }
            }

            if (hasNonNumeric) {
                issues.push(`Column "${table.headers[colIdx]}" contains non-numeric values. Please ensure all readings are numbers.`);
            }
        }
    }

    return issues;
}

/**
 * Generate a user-friendly prompt for missing data
 */
export function generateDataRequest(table: ExtractedTable): string {
    const missingFields = identifyMissingFields(table);

    if (missingFields.length === 0 && table.isFilled) {
        return "Table data looks complete! Ready to plot the graph.";
    }

    const tableTitle = table.title || `Table ${table.id}`;

    if (table.rows.length === 0) {
        return `📊 **${tableTitle}** is empty.\n\nPlease provide your experimental readings for:\n${table.headers.map(h => `• ${h}`).join('\n')}\n\nYou can either:\n1. Upload a filled PDF with the data\n2. Enter the data manually in the form below`;
    }

    if (missingFields.length === table.headers.length) {
        return `📊 **${tableTitle}** has no data filled in.\n\nPlease provide values for: ${missingFields.join(', ')}\n\nYou can either:\n1. Upload a filled PDF\n2. Enter the data manually`;
    }

    return `📊 **${tableTitle}** is partially filled (${table.completeness.toFixed(1)}% complete).\n\nMissing data for: ${missingFields.join(', ')}\n\nPlease complete these fields to plot the graph.`;
}

/**
 * Determine if we can plot a graph from this table
 */
export function canPlotGraph(table: ExtractedTable): boolean {
    // Need at least 2 columns and 2 rows of data
    if (table.headers.length < 2 || table.rows.length < 2) {
        return false;
    }

    // Need at least 50% completeness
    if (table.completeness < 50) {
        return false;
    }

    // Check if we have at least one numeric column (besides S.No)
    let hasNumericData = false;

    for (let colIdx = 0; colIdx < table.headers.length; colIdx++) {
        const header = table.headers[colIdx].toLowerCase();

        // Skip S.No column
        if (header.includes('s.no') || header.includes('serial')) continue;

        // Check if this column has numeric data
        let allNumeric = true;
        let hasValues = false;

        for (const row of table.rows) {
            const cellValue = String(row[colIdx] || '').trim();
            if (cellValue && cellValue !== '...' && cellValue !== '___') {
                hasValues = true;
                if (isNaN(Number(cellValue))) {
                    allNumeric = false;
                    break;
                }
            }
        }

        if (allNumeric && hasValues) {
            hasNumericData = true;
            break;
        }
    }

    return hasNumericData;
}

/**
 * Comprehensive table validation
 */
export function validateTable(table: ExtractedTable): TableValidationResult {
    const isFilled = isTableFilled(table);
    const completeness = getTableCompleteness(table);
    const missingFields = identifyMissingFields(table);
    const dataQualityIssues = checkDataQuality(table);
    const userPrompt = generateDataRequest(table);
    const canPlot = canPlotGraph(table);

    return {
        isValid: isFilled && dataQualityIssues.length === 0,
        isFilled,
        completeness,
        missingFields,
        dataQualityIssues,
        userPrompt,
        canPlotGraph: canPlot
    };
}

/**
 * Validate multiple tables and determine overall readiness
 */
export function validateTables(tables: ExtractedTable[]): {
    allValid: boolean;
    allFilled: boolean;
    validationResults: TableValidationResult[];
    overallPrompt: string;
    canProceed: boolean;
} {
    const validationResults = tables.map(validateTable);

    const allValid = validationResults.every(r => r.isValid);
    const allFilled = validationResults.every(r => r.isFilled);
    const canProceed = validationResults.some(r => r.canPlotGraph);

    let overallPrompt = '';

    if (allFilled && allValid) {
        overallPrompt = "✅ All tables are filled and validated! Ready to generate graphs.";
    } else if (canProceed) {
        const incompleteTables = validationResults.filter(r => !r.isFilled);
        overallPrompt = `⚠️ ${incompleteTables.length} table(s) need more data. However, I can still plot graphs for the completed tables.`;
    } else {
        overallPrompt = "❌ Please fill in the experimental data before I can plot graphs.";
    }

    return {
        allValid,
        allFilled,
        validationResults,
        overallPrompt,
        canProceed
    };
}
