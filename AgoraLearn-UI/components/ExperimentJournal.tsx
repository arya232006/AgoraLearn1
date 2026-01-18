'use client';

import React, { useState, useEffect } from 'react';
import { Save, BookOpen, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@components/ui/sheet';
import { ScrollArea } from '@components/ui/scroll-area';

interface Experiment {
    id: string;
    title: string;
    date: string;
    data: any; // The 'chart' or 'simulation' payload
    summary: string;
}

export function ExperimentJournal({ currentData, currentSummary }: { currentData: any, currentSummary?: string }) {
    const [savedExperiments, setSavedExperiments] = useState<Experiment[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('agora_experiments');
        if (saved) {
            try { setSavedExperiments(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const saveCurrent = () => {
        if (!currentData) return;
        
        const newExp: Experiment = {
            id: Date.now().toString(),
            title: currentData.title || currentData.type || `Experiment ${new Date().toLocaleDateString()}`,
            date: new Date().toLocaleString(),
            data: currentData,
            summary: currentSummary || "No summary provided."
        };

        const updated = [newExp, ...savedExperiments];
        setSavedExperiments(updated);
        localStorage.setItem('agora_experiments', JSON.stringify(updated));
    };

    const deleteExp = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedExperiments.filter(x => x.id !== id);
        setSavedExperiments(updated);
        localStorage.setItem('agora_experiments', JSON.stringify(updated));
    };

    return (
        <Sheet>
            <div className="fixed bottom-4 left-4 flex gap-2 z-50">
                <Button onClick={saveCurrent} disabled={!currentData} variant="secondary" className="shadow-lg">
                    <Save className="w-4 h-4 mr-2" /> Save to Journal
                </Button>
                <SheetTrigger asChild>
                    <Button variant="outline" className="shadow-lg bg-white/90 backdrop-blur">
                        <BookOpen className="w-4 h-4 mr-2" /> My Journal ({savedExperiments.length})
                    </Button>
                </SheetTrigger>
            </div>

            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Experiment Journal</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[90vh] mt-4 pr-4">
                    {savedExperiments.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">No saved experiments yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {savedExperiments.map(exp => (
                                <div key={exp.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 relative group cursor-pointer hover:border-cyan-400 transition-colors">
                                    <div className="font-bold text-lg mb-1">{exp.title}</div>
                                    <div className="text-xs text-gray-400 mb-2">{exp.date}</div>
                                    <div className="text-sm text-gray-600 line-clamp-3 bg-white p-2 rounded border mb-2">
                                        {exp.summary}
                                    </div>
                                    <div className="text-xs uppercase font-mono text-cyan-600 bg-cyan-50 inline-block px-1 rounded">
                                        {exp.data.kind || exp.data.type || 'Unknown Type'}
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => deleteExp(exp.id, e)}
                                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
