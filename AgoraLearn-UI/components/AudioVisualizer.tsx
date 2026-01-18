'use client';

import React, { useRef, useEffect, useState } from 'react';

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      
      analyzer.fftSize = 2048;
      source.connect(analyzer);
      analyzerRef.current = analyzer;
      
      setIsListening(true);
      draw();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopListening = () => {
    if (audioContextRef.current) {
        audioContextRef.current.close();
    }
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
  };

  const draw = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const drawFrame = () => {
        if (!analyzerRef.current) return;
        animationRef.current = requestAnimationFrame(drawFrame);
        analyzerRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = 'rgb(20, 20, 20)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    };

    drawFrame();
  };

  return (
    <div className="w-full h-40 bg-black rounded-xl overflow-hidden border border-white/10 relative mt-4">
        <canvas ref={canvasRef} width={600} height={160} className="w-full h-full" />
        <button 
            onClick={isListening ? stopListening : startListening}
            className={`absolute top-2 right-2 px-3 py-1 text-xs rounded-full font-bold uppercase transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
        >
            {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>
        <div className="absolute bottom-2 left-2 text-[10px] text-gray-400">
            Audio Physics: Oscilloscope
        </div>
    </div>
  );
}
