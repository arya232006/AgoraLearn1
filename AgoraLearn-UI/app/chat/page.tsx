"use client";

import React, { useEffect, useRef, useState } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import DarkVeil from "@components/ui/DarkVeil";
import Navbar from "@components/navbar";
import dynamic from 'next/dynamic';

const ChartWrapper = dynamic(() => import('@components/ChartWrapper'), { ssr: false });
const ThreeDWrapper = dynamic(() => import('@components/ThreeDWrapper'), { ssr: false });
const AudioVisualizer = dynamic(() => import('@components/AudioVisualizer'), { ssr: false });
const QuizInterface = dynamic(() => import('@components/QuizInterface'), { ssr: false });
import { ExperimentJournal } from '@components/ExperimentJournal';

import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { 
  Send, 
  Mic, 
  MicOff, 
  Headphones, 
  AudioLines,
  Paperclip, 
  X, 
  Bot, 
  FlaskConical,
  User, 
  Sparkles, 
  FileText, 
  Download
} from "lucide-react";

/**
 * Types
 */
type Role = "user" | "assistant";
type Message = { 
  id: string; 
  role: Role; 
  content?: string; 
  kind?: 'text' | 'table' | 'chart' | 'reading-input' | '3d' | 'quiz'; 
  payload?: any; 
  createdAt?: string; 
  // Lab Assistant specific
  calculations?: any;
  conclusion?: string;
  graphConfig?: any;
};
type RagChunk = { id?: string; text?: string; score?: number; source?: string };

/**
 * Helpers
 */
// Auto-calculate slope/intercept/curve-fit on frontend
function calculateRegression(data: any) {
  // If data is the whole chart object, extract series
  let points: {x:number, y:number}[] = [];
  
  if (Array.isArray(data)) {
      points = data.map((d:any) => ({x: Number(d.x||d.X||d[0]), y: Number(d.y||d.Y||d[1])}));
  } else if (data && data.data && data.data.datasets && data.data.datasets[0]) {
      // standard chartjs structure
      const ds = data.data.datasets[0].data;
      if (Array.isArray(ds)) {
           points = ds.map((d:any) => {
               if(typeof d === 'number') return {x: NaN, y: d}; // Cant do regression without x
               return {x: Number(d.x), y: Number(d.y)};
           });
           // If X comes from labels
           if(data.data.labels && points.every(p => isNaN(p.x))) {
               points = points.map((p, i) => ({x: Number(data.data.labels[i]), y: p.y}));
           }
      }
  } else if (data && Array.isArray(data.series) && data.series[0]) {
       points = data.series[0].points.map((p:any) => ({x: Number(p.x), y: Number(p.y)}));
  }

  // Filter valid
  points = points.filter(p => !isNaN(p.x) && !isNaN(p.y));
  if (points.length < 2) return null;

  // --- Helpers ---
  const getR2 = (predFn: (x:number)=>number) => {
       const ys = points.map(p => p.y);
       const yMean = ys.reduce((a,b)=>a+b,0)/ys.length;
       const ssTot = ys.reduce((a,b)=>a+(b-yMean)**2,0);
       const ssRes = points.reduce((a,p)=>a+(p.y-predFn(p.x))**2,0);
       return ssTot === 0 ? 0 : 1 - (ssRes/ssTot);
  };

  // 1. Linear (y = mx + c)
  let linear = null;
  {
      let n=0, sx=0, sy=0, sxy=0, sxx=0;
      for(const p of points){ sx+=p.x; sy+=p.y; sxy+=p.x*p.y; sxx+=p.x*p.x; n++; }
      const den = n*sxx - sx*sx;
      if(Math.abs(den) > 1e-9) {
          const slope = (n*sxy - sx*sy)/den;
          const intercept = (sy - slope*sx)/n;
          const r2 = getR2(x => slope*x + intercept);
          linear = { type: 'linear', slope, intercept, r2, equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}` };
      }
  }

  // 2. Exponential (y = ae^bx) -> ln(y) = ln(a) + bx
  let exponential = null;
  const validExp = points.filter(p => p.y > 0);
  if (validExp.length >= 2) {
      let n=0, sx=0, sy=0, sxy=0, sxx=0;
      for(const p of validExp){ 
          const lx = p.x; const ly = Math.log(p.y);
          sx+=lx; sy+=ly; sxy+=lx*ly; sxx+=lx*lx; n++; 
      }
      const den = n*sxx - sx*sx;
      if(Math.abs(den) > 1e-9) {
          const b = (n*sxy - sx*sy)/den;
          const lnA = (sy - b*sx)/n;
          const a = Math.exp(lnA);
          const r2 = getR2(x => a * Math.exp(b*x));
          exponential = { type: 'exponential', a, b, r2, equation: `y = ${a.toFixed(4)}e^{${b.toFixed(4)}x}` };
      }
  }

  // 3. Polynomial (Quadratic: y = ax^2 + bx + c)
  let polynomial = null;
  if (points.length >= 3) {
       let n=points.length, sx=0, sx2=0, sx3=0, sx4=0, sy=0, sxy=0, sx2y=0;
       for(const p of points) {
           const x = p.x; const y = p.y;
           sx+=x; sx2+=x*x; sx3+=x**3; sx4+=x**4;
           sy+=y; sxy+=x*y; sx2y+=x*x*y;
       }
       // Cramer's Rule for 3x3 to solve M * [c, b, a]^T = V
       const M = [[n, sx, sx2], [sx, sx2, sx3], [sx2, sx3, sx4]];
       const det = (m:number[][]) => 
           m[0][0]*(m[1][1]*m[2][2]-m[2][1]*m[1][2]) -
           m[0][1]*(m[1][0]*m[2][2]-m[2][0]*m[1][2]) +
           m[0][2]*(m[1][0]*m[2][1]-m[2][0]*m[1][1]);
       
       const D = det(M);
       if (Math.abs(D) > 1e-9) {
           const Dc = det([[sy, sx, sx2], [sxy, sx2, sx3], [sx2y, sx3, sx4]]);
           const Db = det([[n, sy, sx2], [sx, sxy, sx3], [sx2, sx2y, sx4]]);
           const Da = det([[n, sx, sy], [sx, sx2, sxy], [sx2, sx3, sx2y]]);
           
           const c = Dc/D;
           const b = Db/D;
           const a = Da/D;
           
           const r2 = getR2(x => a*x*x + b*x + c);
           polynomial = { type: 'polynomial', a, b, c, r2, equation: `y = ${a.toFixed(4)}x^2 + ${b.toFixed(4)}x + ${c.toFixed(4)}` };
       }
  }

  // Select Best Fit
  const models = [linear, exponential, polynomial].filter(m => m !== null) as any[];
  models.sort((a, b) => b.r2 - a.r2); // Descending R2
  
  return models[0] || null;
}

function makeId(prefix = "") {
  try {
    return prefix + (crypto as any).randomUUID();
  } catch {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

function renderMathInline(content: string) {
  const elements: React.ReactNode[] = [];
  if (typeof content !== "string") return content;
  let lastIndex = 0;
  const regex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
  let match: RegExpExecArray | null;
  let mathIndex = 0;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      elements.push(<span key={`text-${mathIndex}`}>{content.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      elements.push(<BlockMath key={`block-${mathIndex}`} math={match[1]} errorColor="#cc0000" />);
    } else if (match[2]) {
      elements.push(<InlineMath key={`inline-${mathIndex}`} math={match[2]} errorColor="#cc0000" />);
    }
    lastIndex = regex.lastIndex;
    mathIndex++;
  }
  if (lastIndex < content.length) {
    elements.push(<span key="text-end">{content.slice(lastIndex)}</span>);
  }
  return <>{elements}</>;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toUTCString();
  } catch {
    return String(dateStr);
  }
}

/**
 * Upload helper with progress (XHR)
 */
function uploadWithProgress(file: File, onProgress: (p: number) => void) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file, file.name);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
    xhr.open("POST", `${apiBase}/api/upload`, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error("Upload failed: " + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(fd);
  });
}

/**
 * Component
 */
export default function ChatPage() {
  // messages and input
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm here to help you with your documents. Ask me any questions.",
      kind: 'text',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // single uploaded doc (only one at a time)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // selected before upload
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; name: string } | null>(null); // stored doc from server
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTriggerRef = useRef<HTMLDivElement>(null); // Ref to trigger voice recorder

  // conversation mode
  const [conversationMode, setConversationMode] = useState(false);
  const conversationModeRef = useRef(false); // Ref to track mode inside closures
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  // UI / popups
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencePopup, setReferencePopup] = useState(false);
  const [referenceText, setReferenceText] = useState("");
  const [showInlineReference, setShowInlineReference] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const [showAudioViz, setShowAudioViz] = useState(false);

  // conversation id (auto-generated)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("agoralearn:conversationId");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!conversationId) {
      const id = makeId("conv-");
      setConversationId(id);
      try {
        localStorage.setItem("agoralearn:conversationId", id);
      } catch {}
    }
  }, [conversationId]);

  // auto-scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, uploadProgress]);

  // helpers
  function pushMessage(m: Message) {
    setMessages((p) => [...p, m]);
  }

  // file selection
  function handleFileSelect(file: File) {
    setUploadedFile(file);
  }
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (f) handleFileSelect(f);
  }

  // upload using XHR to show progress; result should contain file.id
  async function handleUpload() {
    if (!uploadedFile) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const data = await uploadWithProgress(uploadedFile, (p) => setUploadProgress(p));
      const id = data?.file?.id ?? data?.docId ?? data?.id;
      const name = data?.file?.name ?? uploadedFile.name;
      if (!id) throw new Error("Upload response missing id");

      // store single doc (replace old)
      setUploadedDoc({ id, name });
      setUploadedFile(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (err: any) {
      console.error("upload error", err);
      setError(String(err?.message ?? "Upload failed"));
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  // voice input: record -> send to /api/voice-query -> gets transcript -> sendQuery
  async function handleVoiceInput() {
    if (!isRecording) {
      setIsRecording(true);
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // --- Audio Analysis for Silence Detection ---
        let audioContext: AudioContext | null = null;
        let source: MediaStreamAudioSourceNode | null = null;
        let checkAudioLevel = () => {};

        if (typeof window !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioContext = new AudioContextClass();
          source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let speechDetected = false;
          
          checkAudioLevel = () => {
              if (mediaRecorderRef.current?.state !== "recording") return;
              analyser.getByteFrequencyData(dataArray);
              // Calculate average volume
              let sum = 0;
              for(let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i];
              }
              const average = sum / bufferLength;
              
              // Threshold to detect speech vs background noise
              if (average > 10) {
                  speechDetected = true;
              }
              requestAnimationFrame(checkAudioLevel);
          };
        }
        
        // --------------------------------------------
        // --------------------------------------------

        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        mr.onstop = async () => {
          setIsRecording(false);
          
          // Cleanup Audio Context
          if (source) source.disconnect();
          // Fix: Avoid accessing 'state' if context is null
          if (audioContext && audioContext.state !== 'closed') await audioContext.close();
          
          // Stop all tracks to release mic
          stream.getTracks().forEach(track => track.stop());

          // If no speech was detected, don't send to API
          // We assume true if context wasn't available (SSR/fallback)
          let speechDetected_final = true; 
          // Logic for speech detection was inside the if(window) block. 
          // We need to move the variable scope or just proceed safely.
          
          // Simplified: Always process if we have chunks, unless we explicitly detected silence via context
          
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          if (uploadedDoc) fd.append("docId", uploadedDoc.id);
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
            const rsp = await fetch(`${apiBase}/api/voice-query`, { method: "POST", body: fd });
            if (!rsp.ok) throw new Error("STT failed");
            const j = await rsp.json();
            const question = j?.question ?? j?.transcript;
            
            // Filter out common hallucinations
            // Expanded for multi-lingual safety and context awareness
            const hallucinations = [
                "you", "thank you", "bye", ".", "..", "...", "you.", "thank you.", "mbc",
                "subtitle by", "amara.org", "uncaptioned", "948"
            ];
            
            const cleanQuestion = typeof question === "string" ? question.trim() : "";
            const lowerQ = cleanQuestion.toLowerCase();

            // Check if it's a hallucination OR very short non-cjk text (likely noise)
            const isHallucination = hallucinations.some(h => lowerQ.includes(h)) && lowerQ.length < 20;

            if (cleanQuestion && !isHallucination) {
              await sendQuery(cleanQuestion);
            } else {
              // Hallucination or empty
              if (conversationModeRef.current) {
                 // Restart listening if we ignored the input
                 setTimeout(() => handleVoiceInput(), 100);
              } else {
                 pushMessage({ id: makeId("a-"), role: "assistant", content: "I couldn't hear a clear question." });
              }
            }
          } catch (err: any) {
            console.error(err);
            if (conversationModeRef.current) {
                 // Restart listening on error
                 setTimeout(() => handleVoiceInput(), 100);
            } else {
                 pushMessage({ id: makeId("a-"), role: "assistant", content: "Voice processing failed." });
            }
          }
        };
        mr.start();
        checkAudioLevel(); // Start monitoring

        setTimeout(() => {
          if (mr.state !== "inactive") mr.stop();
        }, 25_000);
      } catch (err) {
        console.error("mic error", err);
        setIsRecording(false);
        setError("Microphone access denied or unavailable.");
      }
    } else {
      mediaRecorderRef.current?.stop();
    }
  }

  // selection popup
  function handleMouseUp(e?: React.MouseEvent) {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim() === "") {
      setPopupPosition(null);
      setSelectedText(null);
      return;
    }
    const text = sel.toString();
    setSelectedText(text);
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setPopupPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
  }

  async function handleAskAgoraLearn() {
    if (!selectedText) return;
    // Show the selected text inline above the chat input as a reference
    setReferenceText(selectedText);
    setShowInlineReference(true);
    // Clear the inline selection popup and selection highlight
    setPopupPosition(null);
    setSelectedText(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch {}
  }

  // main send query -> converse
  async function sendQuery(queryText: string) {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setError(null);

    const userMsg: Message = { id: makeId("u-"), role: "user", content: queryText, createdAt: new Date().toISOString() };
    pushMessage(userMsg);

    const payload: any = { query: queryText };
    if (uploadedDoc) payload.docId = uploadedDoc.id;
    if (showInlineReference && referenceText) payload.reference = referenceText;
    if (conversationId) payload.conversationId = conversationId;

    try {
      // send to unified prompt router which classifies and returns structured results
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${apiBase}/api/handle-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: queryText, docId: uploadedDoc?.id, replyWithAudio: conversationModeRef.current }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const body = await res.json();

      // Play Audio & Loop
      if (body.audioBase64) {
        setIsAiSpeaking(true);
        const audio = new Audio(`data:audio/mp3;base64,${body.audioBase64}`);
        audio.onended = () => {
          setIsAiSpeaking(false);
          if (conversationModeRef.current) {
             // Trigger voice recorder again directly
             handleVoiceInput();
          }
        };
        audio.play().catch(e => console.error("Audio play failed", e));
      } else {
          // If no audio response but in conversation mode, restart listening anyway?
          // Or maybe the user wants to read? 
          // Assuming if conversation mode is ON, we always want to listen after response.
          if (conversationModeRef.current) {
              setTimeout(() => handleVoiceInput(), 1000); // Give a second to read
          }
      }

      // handle table responses specially
      if (body?.intent === 'table_qa' && body?.result) {
        const parsed = body.result.extracted ?? body.result.tables ?? null;
        const answer = body.result.answer ?? body.result.qa ?? null;
        if (parsed) {
          pushMessage({ id: makeId('a-table-'), role: 'assistant', kind: 'table', payload: parsed, createdAt: new Date().toISOString() });
        }
        if (answer) {
          pushMessage({ id: makeId('a-'), role: 'assistant', kind: 'text', content: String(answer), createdAt: new Date().toISOString() });
        } else if (!parsed) {
          const fallback = body?.result?.message || 'No table data found.';
          pushMessage({ id: makeId('a-'), role: 'assistant', kind: 'text', content: String(fallback), createdAt: new Date().toISOString() });
        }
      } else if (body?.intent === 'chart_analysis' && body?.result) {
        const parsed = body.result.chart ?? body.result.parsed ?? body.result;
        const insights = body.result.insights ?? body.result.summary ?? null;
        if (parsed) {
            // debug: log chart payload to browser console to inspect shape
            try { console.log("[AgoraLearn] chart payload:", parsed); } catch {}
          // attach insights into parsed payload for ChartBubble
          if (insights) parsed.insights = typeof insights === 'string' ? insights : JSON.stringify(insights);
          pushMessage({ id: makeId('a-chart-'), role: 'assistant', kind: 'chart', payload: parsed, createdAt: new Date().toISOString() });
        } else {
          pushMessage({ id: makeId('a-'), role: 'assistant', kind: 'text', content: String(body?.result?.message ?? 'No chart data found.'), createdAt: new Date().toISOString() });
        }
      } else if (body?.intent === 'lab_assistant' && body.result) {
        const { calculations, conclusion, graphConfig } = body.result;
        
        if (graphConfig) {
            pushMessage({
                id: makeId('a-lab-'),
                role: 'assistant',
                kind: 'chart',
                payload: graphConfig,
                calculations,
                conclusion,
                createdAt: new Date().toISOString()
            });
        } else {
            // Fallback if graph generation failed but we have text
            const fallbackText = conclusion || body.result.message || "Processed readings, but could not generate graph.";
            pushMessage({
                id: makeId('a-lab-err-'),
                role: 'assistant',
                kind: 'text',
                content: fallbackText,
                createdAt: new Date().toISOString()
            });
        }
      } else if (body?.intent === '3d_viz' || body?.result?.kind === '3d') {
        const payload = body.result.payload;
         if (payload) {
             pushMessage({ id: makeId('a-3d-'), role: 'assistant', kind: '3d', payload: payload, createdAt: new Date().toISOString() });
         } else {
             const fallback = body.result.message || "Could not generate 3D visualization.";
             pushMessage({ id: makeId('a-err-'), role: 'assistant', kind: 'text', content: String(fallback), createdAt: new Date().toISOString() });
         }
      } else if (body?.intent === 'quiz_gen' && body?.result?.questions) {
         pushMessage({ 
            id: makeId('a-quiz-'), 
            role: 'assistant', 
            kind: 'quiz', 
            payload: body.result, 
            createdAt: new Date().toISOString() 
         });
      } else {
        // default: show textual result (summary / rag / chart insights)
        const answer = body?.result?.summary ?? body?.result?.answer ?? body?.result ?? (body?.result?.insights ?? null);
        let contentStr = '';
        if (typeof answer === 'string') contentStr = answer;
        else if (answer && typeof answer === 'object') contentStr = JSON.stringify(answer, null, 2);
        else contentStr = String(body?.result ?? body?.message ?? '');
        pushMessage({ id: makeId('a-'), role: 'assistant', kind: 'text', content: contentStr, createdAt: new Date().toISOString() });
      }
    } catch (err: any) {
      console.error("converse error", err);
      pushMessage({ id: makeId("a-"), role: "assistant", content: "Sorry — something went wrong." });
      setError(String(err?.message ?? "Error"));
      
      // If error occurs in conversation mode, restart listening
      if (conversationModeRef.current) {
          setTimeout(() => handleVoiceInput(), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim()) return;
    await sendQuery(inputValue);
    setInputValue("");
  }

  // export conversation
  function exportConversation() {
    try {
      const payload = { conversationId, messages, uploadedDoc, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${conversationId ?? "local"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Export failed");
    }
  }

  // UI
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
             <DarkVeil resolutionScale={1} hueShift={0} noiseIntensity={0.02} scanlineIntensity={0.02} speed={0.4} warpAmount={0.02} />
        </div>
        
        <div className="relative z-10 flex flex-col h-screen">
            <Navbar />
            
            {/* Main Chat Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative max-w-5xl mx-auto w-full pt-4">
                
                {/* Header / Toolbar */}
                <div className="px-6 py-3 flex items-center justify-between bg-black/20 backdrop-blur-sm border-b border-white/5 mx-4 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-medium text-white">AgoraLearn AI</h2>
                            <p className="text-xs text-gray-400">Always here to help</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         {/* Audio Viz Toggle */}
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setShowAudioViz(!showAudioViz)} 
                            className={`${showAudioViz ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-400'} hover:text-white hover:bg-white/10`}
                            title="Toggle Audio Oscilloscope"
                         >
                            <AudioLines className="h-4 w-4" />
                         </Button>

                         {/* Export Button */}
                         <Button variant="ghost" size="icon" onClick={exportConversation} className="text-gray-400 hover:text-white hover:bg-white/10">
                            <Download className="h-4 w-4" />
                         </Button>
                    </div>
                </div>

                {/* Audio Viz Panel */}
                {showAudioViz && (
                    <div className="mx-4 mb-2">
                        <AudioVisualizer />
                    </div>
                )}

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent mx-4 bg-black/20 backdrop-blur-sm border-x border-white/5" onMouseUp={handleMouseUp}>
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                            <Bot className="h-16 w-16 text-indigo-500/50 mb-4" />
                            <h3 className="text-xl font-medium text-white mb-2">Welcome to AgoraLearn</h3>
                            <p className="text-sm text-gray-400 max-w-md">
                                Ask questions, upload documents, or start a voice conversation. I'm ready to assist you.
                            </p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                {/* Avatar */}
                                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-indigo-600" : "bg-emerald-600/20 border border-emerald-500/30"}`}>
                                    {m.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-emerald-400" />}
                                </div>

                                {/* Bubble */}
                                <div className={`flex flex-col max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        m.role === "user" 
                                        ? "bg-indigo-600 text-white rounded-tr-sm" 
                                        : "bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm backdrop-blur-md"
                                    }`}>
                                        {m.kind === 'table' && m.payload ? (
                                          // render structured tables
                                          <div style={{ maxWidth: 800, overflowX: 'auto' }}>
                                            {Array.isArray(m.payload) ? m.payload.map((t: any, ti: number) => (
                                              <section key={ti} style={{ marginBottom: 12 }}>
                                                {t.title && <div style={{ fontWeight: 600, marginBottom: 6 }}>{t.title}</div>}
                                                <div style={{ overflowX: 'auto' }}>
                                                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                                                    <thead>
                                                      <tr>
                                                        {(t.columns || t.headers || []).map((h: any, hi: number) => (
                                                          <th key={hi} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', padding: 8, textAlign: 'left', fontWeight: 600 }}>{String(h)}</th>
                                                        ))}
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {(t.rows || t.data || []).map((r: any, ri: number) => (
                                                        <tr key={ri}>
                                                          {r.map((c: any, ci: number) => (
                                                            <td key={ci} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{renderMathInline(String(c))}</td>
                                                          ))}
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </section>
                                            )) : <div>No table data</div>}
                                          </div>
                                        ) : m.kind === 'chart' && m.payload ? (
                                          <div className="space-y-3 w-full">
                                            <ExperimentJournal currentData={m.payload} currentSummary={m.content || m.conclusion || "Chart Analysis"} />
                                            {(() => {
                                                // Try to get calculations from message, OR calculate on the fly
                                                const stats = m.calculations || calculateRegression(m.payload);
                                                
                                                if (!stats) return null;
                                                
                                                return (
                                                  <div className="bg-white/5 border border-white/10 p-3 rounded text-sm mb-2">
                                                      <div className="flex flex-wrap gap-4 text-xs font-mono text-indigo-300 items-center">
                                                          {stats.type === 'linear' && (
                                                            <>
                                                              <span>m = {Number(stats.slope).toFixed(3)}</span>
                                                              <span>c = {Number(stats.intercept).toFixed(3)}</span>
                                                            </>
                                                          )}
                                                          {stats.r2 !== undefined && <span>R² = {Number(stats.r2).toFixed(4)}</span>}
                                                          <span className="uppercase text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{stats.type} FIT</span>
                                                      </div>
                                                       {/* Only show equation if we just calculated it */}
                                                      {!m.calculations && stats.equation && (
                                                        <div className="mt-2 text-xs text-gray-400 font-mono">
                                                            Eq: <InlineMath math={stats.equation.replace(/^y\s*=\s*/, '').trim()} />
                                                        </div>
                                                      )}
                                                      {stats.error_analysis && <div className="mt-2 text-gray-300 text-xs italic">{stats.error_analysis}</div>}
                                                  </div>
                                                );
                                            })()}

                                              {/* lazy-load ChartBubble to avoid adding chart deps to initial bundle */}
                                              <React.Suspense fallback={<div>Rendering chart...</div>}>
                                                {/* @ts-ignore dynamic import for client component */}
                                                <ChartWrapper chart={m.payload} />
                                              </React.Suspense>

                                              {m.conclusion && (
                                                  <div className="text-sm text-gray-200 mt-2 p-2 bg-emerald-900/30 border-l-2 border-emerald-500 rounded-r">
                                                      <strong className="block text-emerald-400 text-xs uppercase tracking-wide mb-1">Conclusion</strong>
                                                      {renderMathInline(m.conclusion)}
                                                  </div>
                                              )}
                                          </div>
                                        ) : m.kind === 'quiz' && m.payload ? (
                                            <div className="w-full">
                                                <React.Suspense fallback={<div>Loading Quiz...</div>}>
                                                     <QuizInterface data={m.payload} />
                                                </React.Suspense>
                                            </div>
                                        ) : m.kind === '3d' && m.payload ? (
                                            <div className="space-y-3 w-full h-full min-h-[400px]">
                                                {/* Save Button for 3D/Scientific data */}
                                                <ExperimentJournal currentData={m.payload} currentSummary={m.content} />
                                                
                                                <React.Suspense fallback={<div className="h-[400px] flex items-center justify-center bg-white/5 animate-pulse rounded">Loading 3D Engine...</div>}>
                                                    <ThreeDWrapper data={m.payload} />
                                                </React.Suspense>
                                                <div className="text-xs text-gray-400 text-center italic">
                                                    Interacting with 3D Ecosystem • {m.payload.type === 'molecule' ? 'Chemistry' : 'Physics'} Mode
                                                </div>
                                            </div>
                                        ) : (
                                          renderMathInline(m.content ?? '')
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1 px-1">
                                        {formatDate(m.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {isLoading && (
                         <div className="flex gap-4">
                            <div className="shrink-0 h-8 w-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 mx-4 mb-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-b-2xl rounded-t-none">
                    {/* Inline Reference Preview */}
                    {showInlineReference && referenceText && (
                        <div className="mb-3 p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 flex items-start gap-3">
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mt-0.5">Reference</div>
                            <div className="flex-1 text-sm text-gray-300 line-clamp-2 italic">"{referenceText}"</div>
                            <button onClick={() => { setReferenceText(''); setShowInlineReference(false); }} className="text-gray-400 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Uploaded File Preview */}
                    {uploadedDoc && (
                        <div className="mb-3 flex items-center gap-2">
                            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-2">
                                <FileText className="h-3 w-3 text-indigo-400" />
                                <span className="max-w-[200px] truncate">{uploadedDoc.name}</span>
                                <button onClick={() => setUploadedDoc(null)} className="hover:text-red-400 ml-1"><X className="h-3 w-3" /></button>
                            </div>
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="flex items-end gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setShowUploadModal(true)}
                            className="rounded-full h-10 w-10 bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>

                        <div className="flex-1 relative bg-white/5 border border-white/10 rounded-2xl focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Ask anything..."
                                className="w-full bg-transparent border-none text-white placeholder-gray-500 px-4 py-3 focus:ring-0 resize-none max-h-32 min-h-11"
                                rows={1}
                                style={{ height: 'auto', minHeight: '44px' }} 
                                disabled={isLoading}
                            />
                        </div>

                        {/* Voice Controls */}
                        <div className="flex items-center gap-1" ref={voiceTriggerRef}>
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleVoiceInput}
                                className={`rounded-full h-10 w-10 transition-all ${isRecording ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/50" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                            >
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </Button>
                            
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Quick Lab Assistant Helper: Insert prompt template
                                  setInputValue("Here are my readings for the experiment:\nVars: x, y\nData:\n1, 2\n2, 4\n3, 6\n\nPlot the graph and find slope.");
                                }}
                                className="rounded-full h-10 w-10 text-gray-400 hover:text-white hover:bg-white/10 hidden md:flex"
                                title="Lab Assistant Template"
                            >
                                <FlaskConical className="h-4 w-4" />
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (conversationMode) {
                                        // Turn OFF
                                        setConversationMode(false);
                                        // If currently recording, stop it
                                        if (isRecording) {
                                            mediaRecorderRef.current?.stop();
                                        }
                                        // If AI is speaking, stop it
                                        const audioElements = document.getElementsByTagName('audio');
                                        for(let i=0; i<audioElements.length; i++) {
                                            audioElements[i].pause();
                                            audioElements[i].currentTime = 0;
                                        }
                                        setIsAiSpeaking(false);
                                    } else {
                                        // Turn ON
                                        setConversationMode(true);
                                        // Start listening immediately if not already
                                        if (!isRecording) handleVoiceInput();
                                    }
                                }}
                                className={`rounded-full h-10 w-10 transition-all ${
                                    conversationMode 
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                                    : "text-gray-400 hover:text-white hover:bg-white/10"
                                }`}
                                title={conversationMode ? "Stop Voice Mode" : "Start Voice Mode"}
                            >
                                {conversationMode ? (
                                    <div className="flex items-center justify-center">
                                        <AudioLines className="h-5 w-5 animate-pulse" />
                                    </div>
                                ) : (
                                    <Headphones className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <Button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            size="icon"
                            className="rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Status / Error */}
                    <div className="absolute bottom-full left-0 w-full px-4 pb-2 pointer-events-none">
                         {showSuccess && <div className="text-xs text-green-400 bg-black/80 backdrop-blur px-2 py-1 rounded inline-block">File uploaded successfully!</div>}
                         {error && <div className="text-xs text-red-400 bg-black/80 backdrop-blur px-2 py-1 rounded inline-block">{error}</div>}
                         {uploadProgress !== null && <div className="text-xs text-indigo-400 bg-black/80 backdrop-blur px-2 py-1 rounded inline-block">Uploading: {uploadProgress}%</div>}
                    </div>
                </div>
            </main>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 z-10 w-full max-w-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Upload Document</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} 
                            onDragLeave={() => setIsDragging(false)} 
                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); }} 
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20 bg-white/5"}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-6 w-6 text-indigo-400" />
                            </div>
                            <p className="text-gray-300 mb-2">Drag and drop your file here</p>
                            <p className="text-xs text-gray-500 mb-6">PDF, DOCX, TXT supported</p>
                            
                            <input ref={fileInputRef} type="file" onChange={handleFileInputChange} className="hidden" accept=".pdf,.doc,.docx,.txt,image/*" />
                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-white/10 hover:bg-white/10 text-white">Browse Files</Button>
                        </div>

                        {uploadedFile && (
                            <div className="mt-4 bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-sm text-gray-200 truncate max-w-[200px]">{uploadedFile.name}</span>
                                <Button onClick={() => setUploadedFile(null)} size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-400/10">Remove</Button>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <Button onClick={() => setShowUploadModal(false)} variant="ghost" className="text-gray-400 hover:text-white">Cancel</Button>
                            <Button 
                                onClick={handleUpload} 
                                disabled={isUploading || !uploadedFile}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                                {isUploading ? `Uploading${uploadProgress !== null ? ` (${uploadProgress}%)` : "..."}` : "Upload Document"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Selection Popup */}
        {popupPosition && selectedText && (
            <div style={{ position: "absolute", top: popupPosition.top, left: popupPosition.left, zIndex: 1000 }} className="animate-in fade-in zoom-in duration-200">
                <Button size="sm" onClick={handleAskAgoraLearn} className="bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 rounded-full px-4">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Ask AI
                </Button>
            </div>
        )}
    </div>
  );
}
