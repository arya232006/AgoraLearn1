'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface QuizData {
    title: string;
    questions: Question[];
}

export default function QuizInterface({ data }: { data: QuizData }) {
    const [answers, setAnswers] = useState<Record<number, number>>({}); // qId -> optionIndex
    const [showResults, setShowResults] = useState(false);

    const handleSelect = (qId: number, optIndex: number) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qId]: optIndex }));
    };

    const calculateScore = () => {
        let score = 0;
        data.questions.forEach(q => {
            if (answers[q.id] === q.correctIndex) score++;
        });
        return score;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto my-6">
            <h2 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400 border-b pb-2">{data.title || 'Pop Quiz'}</h2>
            
            <div className="space-y-6">
                {data.questions.map((q, idx) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer === q.correctIndex;
                    
                    return (
                        <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <p className="font-medium text-gray-800 dark:text-gray-100 mb-3">{idx + 1}. {q.question}</p>
                            <div className="space-y-2">
                                {q.options.map((opt, optIdx) => (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleSelect(q.id, optIdx)}
                                        className={`w-full text-left px-4 py-2 rounded text-sm transition-all border ${
                                            showResults
                                                ? optIdx === q.correctIndex
                                                    ? 'bg-green-100 border-green-500 text-green-800'
                                                    : userAnswer === optIdx
                                                        ? 'bg-red-100 border-red-500 text-red-800'
                                                        : 'bg-white border-gray-200 opacity-50'
                                                : userAnswer === optIdx
                                                    ? 'bg-cyan-100 border-cyan-500 text-cyan-900 font-semibold'
                                                    : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {showResults && (
                                <div className={`mt-3 text-sm p-3 rounded flex items-start gap-2 ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {isCorrect ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                                    <div>
                                        <span className="font-bold">{isCorrect ? 'Correct!' : 'Incorrect.'}</span> {q.explanation}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 flex justify-between items-center bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                 {!showResults ? (
                     <button 
                        onClick={() => setShowResults(true)}
                        disabled={Object.keys(answers).length < data.questions.length}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                        Submit Answers
                     </button>
                 ) : (
                     <div className="flex items-center gap-4 w-full">
                        <div className="text-lg font-bold">
                            Score: <span className="text-cyan-600">{calculateScore()}</span> / {data.questions.length}
                        </div>
                        <button 
                            onClick={() => { setShowResults(false); setAnswers({}); }}
                            className="ml-auto text-sm text-gray-500 underline hover:text-gray-800"
                        >
                            Retake Quiz
                        </button>
                     </div>
                 )}
            </div>
        </div>
    );
}
