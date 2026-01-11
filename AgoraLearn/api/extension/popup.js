document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("askBtn");
  const micBtn = document.getElementById("micBtn");
  const voiceModeBtn = document.getElementById("voiceModeBtn");
  const headphoneIcon = document.getElementById("headphoneIcon");
  const waveIcon = document.getElementById("waveIcon");
  const questionEl = document.getElementById("question");
  const messagesEl = document.getElementById("messages");
  const statusEl = document.getElementById("status");

  let isRecording = false;
  let conversationMode = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let audioContext = null;
  let analyser = null;
  let silenceTimer = null;
  let isAiSpeaking = false;

  // --- Helper Functions ---

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMathInText(text) {
    if (!window.katex || typeof window.katex.renderToString !== 'function') {
      return escapeHtml(text).replace(/\n/g, '<br>');
    }
    // Simplified KaTeX rendering for brevity
    try {
      return window.katex.renderToString(text, { throwOnError: false, displayMode: false });
    } catch (e) {
      return escapeHtml(text);
    }
  }

  function appendBubble(text, who = "assistant") {
    const wrap = document.createElement("div");
    wrap.className = "bubble " + (who === "user" ? "user" : "assistant");
    wrap.innerHTML = who === "assistant" ? renderMathInText(String(text || '')) : escapeHtml(String(text || ''));
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  // --- Core Logic ---

  function getPageContext(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return cb({ ok: false, error: "No active tab" });
      
      // Try to get stored docId first
      chrome.storage.local.get(['lastIngestedByUrl'], (r) => {
        const map = (r && r.lastIngestedByUrl) || {};
        const storedDocId = map[tab.url] ?? null;
        
        if (storedDocId) {
          return cb({ ok: true, docId: storedDocId });
        }

        // If not found, ingest
        setStatus("Ingesting page...");
        chrome.runtime.sendMessage({ type: 'INGEST_ACTIVE_TAB' }, (ingResp) => {
          if (!ingResp || !ingResp.ok) {
            return cb({ ok: false, error: ingResp?.error || "Ingest failed" });
          }
          // Fix: api/upload.ts returns { file: { id: ... } }, not docId at top level
          const docId = ingResp.docId ?? ingResp.file?.id ?? ingResp.meta?.docId;
          
          if (!docId) {
             console.warn("Ingest succeeded but no docId returned", ingResp);
             return cb({ ok: false, error: "Ingest succeeded but returned no document ID" });
          }

          const newMap = Object.assign({}, map);
          if (tab.url && docId) newMap[tab.url] = docId;
          chrome.storage.local.set({ lastIngestedByUrl: newMap });
          cb({ ok: true, docId });
        });
      });
    });
  }

  function sendQuery(text, docId) {
    setStatus("Thinking...");
    if (!conversationMode) appendBubble(text, "user");

    chrome.runtime.sendMessage({ 
      type: "QUERY_RAG", 
      query: text, 
      docId, 
      replyWithAudio: conversationMode 
    }, (resp) => {
      if (!resp || !resp.ok) {
        setStatus("Error: " + (resp?.error || "Unknown error"));
        appendBubble("Sorry, something went wrong.", "assistant");
        if (conversationMode) setTimeout(startListening, 2000); // Retry listening
        return;
      }

      // resp.result is the JSON from handle-query, which looks like { ok: true, result: { answer: ... } }
      // So we need to dig into resp.result.result
      const apiResponse = resp.result || {};
      const actualResult = apiResponse.result || apiResponse; // Fallback if not nested
      
      const answer = actualResult.answer || actualResult.text || actualResult.summary || actualResult.message || actualResult.error || "I processed that (no answer returned).";
      
      appendBubble(answer, "assistant");
      setStatus("Done");

      if (actualResult.audioBase64) {
        playAudio(actualResult.audioBase64);
      } else if (conversationMode) {
        // If no audio but in voice mode, wait a bit then listen
        setTimeout(startListening, 1500);
      }
    });
  }

  function playAudio(base64) {
    isAiSpeaking = true;
    setStatus("Speaking...");
    const audio = new Audio("data:audio/mp3;base64," + base64);
    audio.onended = () => {
      isAiSpeaking = false;
      setStatus("Idle");
      if (conversationMode) {
        startListening();
      }
    };
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      isAiSpeaking = false;
      if (conversationMode) startListening();
    });
  }

  // --- Voice Logic ---

  async function startListening() {
    if (isRecording || isAiSpeaking) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isRecording = true;
      micBtn.classList.add("recording");
      setStatus("Listening...");

      // Silence Detection Setup
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speechDetected = false;

      const checkAudioLevel = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        if (average > 10) speechDetected = true;
        requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        micBtn.classList.remove("recording");
        
        // Cleanup
        source.disconnect();
        if (audioContext.state !== 'closed') await audioContext.close();
        stream.getTracks().forEach(t => t.stop());

        if (!speechDetected) {
          console.log("Silence detected");
          if (conversationMode) {
            setTimeout(startListening, 100); // Loop back
          } else {
            setStatus("No speech detected");
          }
          return;
        }

        // Process Audio
        setStatus("Processing voice...");
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        
        // We need to send this blob to background or handle it here.
        // Since background scripts can't easily handle FormData with Blobs from popup sometimes,
        // we'll try to convert to base64 or send to an API endpoint directly if possible.
        // For this extension, let's assume we send to the API directly from here.
        
        getPageContext((ctx) => {
            if (!ctx.ok) {
                setStatus("Error: " + ctx.error);
                return;
            }
            
            const fd = new FormData();
            fd.append("audio", blob, "audio.webm");
            if (ctx.docId) fd.append("docId", ctx.docId);

            fetch("http://localhost:3000/api/voice-query", {
                method: "POST",
                body: fd
            })
            .then(r => r.json())
            .then(data => {
                const q = data.question || data.transcript;
                const hallucinations = ["you", "thank you", "bye", ".", "..", "...", "you.", "thank you.", "mbc"];
                
                if (q && !hallucinations.includes(q.trim().toLowerCase())) {
                    sendQuery(q, ctx.docId);
                } else {
                    if (conversationMode) setTimeout(startListening, 100);
                    else setStatus("Couldn't hear you clearly");
                }
            })
            .catch(err => {
                console.error(err);
                setStatus("Voice error");
                if (conversationMode) setTimeout(startListening, 1000);
            });
        });
      };

      mediaRecorder.start();
      // Record for max 5 seconds or until silence (simplified to fixed duration for now)
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000); // Short chunks for responsiveness

    } catch (err) {
      console.error("Mic error", err);
      setStatus("Mic access denied");
      isRecording = false;
      micBtn.classList.remove("recording");
    }
  }

  function stopListening() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    isRecording = false;
    micBtn.classList.remove("recording");
  }

  // --- Event Listeners ---

  askBtn.addEventListener("click", () => {
    const text = questionEl.value.trim();
    if (!text) return;
    questionEl.value = "";
    getPageContext((ctx) => {
      if (ctx.ok) sendQuery(text, ctx.docId);
      else setStatus(ctx.error);
    });
  });

  questionEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") askBtn.click();
  });

  micBtn.addEventListener("click", () => {
    if (isRecording) stopListening();
    else startListening();
  });

  voiceModeBtn.addEventListener("click", () => {
    conversationMode = !conversationMode;
    if (conversationMode) {
      voiceModeBtn.classList.add("voice-mode");
      headphoneIcon.style.display = "none";
      waveIcon.style.display = "block";
      startListening();
    } else {
      voiceModeBtn.classList.remove("voice-mode");
      headphoneIcon.style.display = "block";
      waveIcon.style.display = "none";
      stopListening();
      // Stop any playing audio
      const audios = document.getElementsByTagName("audio");
      for(let a of audios) a.pause();
      isAiSpeaking = false;
      setStatus("Voice mode off");
    }
  });

  // Initial Load
  getPageContext((res) => {
    if (res.ok) {
      setStatus("Ready");
    } else {
      const msg = res.error || "Unknown error";
      setStatus(`Error loading page context: ${msg}`);
      appendBubble(`Failed to read page: ${msg}`, "assistant");
    }
  });
});