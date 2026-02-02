"use client";

import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { X, Save, Upload, Check, AlertCircle } from 'lucide-react';

export interface TableData {
    id: string;
    title?: string;
    headers: string[];
    rows: string[][];
    isFilled: boolean;
    completeness: number;
}

interface TableDataEntryProps {
    table: TableData;
    onSave: (tableId: string, data: string[][]) => void;
    onClose: () => void;
}

export function TableDataEntry({ table, onSave, onClose }: TableDataEntryProps) {
    const [editedRows, setEditedRows] = useState<string[][]>(
        table.rows.length > 0
            ? table.rows.map(row => [...row])
            : Array(5).fill(null).map(() => Array(table.headers.length).fill(''))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteText, setPasteText] = useState('');

    const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
        const newRows = [...editedRows];
        newRows[rowIdx][colIdx] = value;
        setEditedRows(newRows);
    };

    const addRow = () => {
        setEditedRows([...editedRows, Array(table.headers.length).fill('')]);
    };

    const removeRow = (rowIdx: number) => {
        if (editedRows.length > 1) {
            setEditedRows(editedRows.filter((_, idx) => idx !== rowIdx));
        }
    };

    const handlePaste = () => {
        // Parse pasted data (TSV or CSV)
        const lines = pasteText.trim().split('\n');
        const newRows: string[][] = [];

        for (const line of lines) {
            // Try tab-separated first, then comma-separated
            let cells = line.split('\t');
            if (cells.length === 1) {
                cells = line.split(',');
            }

            // Trim and pad to match header count
            const trimmedCells = cells.map(c => c.trim());
            while (trimmedCells.length < table.headers.length) {
                trimmedCells.push('');
            }

            newRows.push(trimmedCells.slice(0, table.headers.length));
        }

        setEditedRows(newRows);
        setPasteMode(false);
        setPasteText('');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Filter out completely empty rows
            const filledRows = editedRows.filter(row =>
                row.some(cell => cell.trim() !== '')
            );

            await onSave(table.id, filledRows);
        } finally {
            setIsSaving(false);
        }
    };

    const calculateCompleteness = () => {
        let totalCells = 0;
        let filledCells = 0;

        for (const row of editedRows) {
            for (const cell of row) {
                totalCells++;
                if (cell.trim() !== '') filledCells++;
            }
        }

        return totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    };

    const completeness = calculateCompleteness();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-700">
                <CardHeader className="border-b border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white">
                                {table.title || `Table ${table.id}`}
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Fill in your experimental data
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Completeness indicator */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-400">Completeness</span>
                            <span className={`font-medium ${completeness >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {completeness.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${completeness >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                style={{ width: `${completeness}%` }}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {!pasteMode ? (
                        <>
                            {/* Action buttons */}
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPasteMode(true)}
                                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Paste from Excel/CSV
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addRow}
                                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                    + Add Row
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="p-2 text-left text-sm font-semibold text-gray-300 w-12">#</th>
                                            {table.headers.map((header, idx) => (
                                                <th key={idx} className="p-2 text-left text-sm font-semibold text-gray-300">
                                                    {header}
                                                </th>
                                            ))}
                                            <th className="p-2 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editedRows.map((row, rowIdx) => (
                                            <tr key={rowIdx} className="border-b border-gray-800 hover:bg-gray-800/50">
                                                <td className="p-2 text-sm text-gray-500">{rowIdx + 1}</td>
                                                {row.map((cell, colIdx) => (
                                                    <td key={colIdx} className="p-2">
                                                        <Input
                                                            value={cell}
                                                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                                            className="bg-gray-800 border-gray-700 text-white text-sm"
                                                            placeholder={`Enter ${table.headers[colIdx]}`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-2">
                                                    {editedRows.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeRow(rowIdx)}
                                                            className="h-8 w-8 text-gray-500 hover:text-red-400"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                                    <div className="text-sm text-blue-200">
                                        <p className="font-medium mb-1">How to paste data:</p>
                                        <ul className="list-disc list-inside space-y-1 text-blue-300">
                                            <li>Copy cells from Excel or Google Sheets</li>
                                            <li>Paste tab-separated or comma-separated values</li>
                                            <li>Each line should represent one row</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="Paste your data here..."
                                className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex gap-2">
                                <Button
                                    onClick={handlePaste}
                                    disabled={!pasteText.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Apply Data
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPasteMode(false);
                                        setPasteText('');
                                    }}
                                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="border-t border-gray-700 p-4 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || completeness < 10}
                        className="bg-indigo-600 hover:bg-indigo-500"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save & Continue'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
