document.addEventListener("DOMContentLoaded", () => {
  const askBtn = document.getElementById("askBtn");
  const questionEl = document.getElementById("question");
  const messagesEl = document.getElementById("messages");
  const statusEl = document.getElementById("status");

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render text with KaTeX if available. Supports $$...$$ (display) and $...$ (inline)
  function renderMathInText(text) {
    if (!window.katex || typeof window.katex.renderToString !== 'function') {
      return escapeHtml(text).replace(/\n/g, '<br>');
    }
    // Replace display math first: $$...$$
    let out = '';
    let rest = text;
    const displayRegex = /\$\$([\s\S]+?)\$\$/g;
    // We'll process by scanning display math positions
    let lastIndex = 0;
    let m;
    const parts = [];
    while ((m = displayRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, m.index);
      if (before) parts.push({ type: 'text', value: before });
      parts.push({ type: 'display', value: m[1] });
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex === 0) {
      // No display math, process inline $...$
      const inlineRegex = /\$([^\$\n]+?)\$/g;
      let li = 0;
      let mm;
      while ((mm = inlineRegex.exec(text)) !== null) {
        const before = text.slice(li, mm.index);
        if (before) parts.push({ type: 'text', value: before });
        parts.push({ type: 'inline', value: mm[1] });
        li = mm.index + mm[0].length;
      }
      if (li === 0) return escapeHtml(text).replace(/\n/g, '<br>');
      const tail = text.slice(li);
      if (tail) parts.push({ type: 'text', value: tail });
    } else {
      const tail = text.slice(lastIndex);
      if (tail) parts.push({ type: 'text', value: tail });
      // For any text parts, further split inline math
      const expanded = [];
      parts.forEach((p) => {
        if (p.type !== 'text') return expanded.push(p);
        const inlineRegex = /\$([^\$\n]+?)\$/g;
        let li = 0;
        let mm;
        const t = p.value;
        while ((mm = inlineRegex.exec(t)) !== null) {
          const before = t.slice(li, mm.index);
          if (before) expanded.push({ type: 'text', value: before });
          expanded.push({ type: 'inline', value: mm[1] });
          li = mm.index + mm[0].length;
        }
        const tail2 = t.slice(li);
        if (tail2) expanded.push({ type: 'text', value: tail2 });
      });
      parts.length = 0; parts.push(...expanded);
    }

    for (const p of parts) {
      if (p.type === 'text') out += escapeHtml(p.value).replace(/\n/g, '<br>');
      else if (p.type === 'inline') {
        try {
          out += window.katex.renderToString(p.value, { throwOnError: false });
        } catch (e) {
          out += escapeHtml('$' + p.value + '$');
        }
      } else if (p.type === 'display') {
        try {
          out += '<div class="katex-display">' + window.katex.renderToString(p.value, { displayMode: true, throwOnError: false }) + '</div>';
        } catch (e) {
          out += escapeHtml('$$' + p.value + '$$');
        }
      }
    }
    return out;
  }

  function appendBubble(text, who = "assistant") {
    const wrap = document.createElement("div");
    wrap.className = "bubble " + (who === "user" ? "user" : "assistant");
    // render math-aware HTML
    wrap.innerHTML = renderMathInText(String(text || ''));
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function getPageContext(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return cb({ ok: false, error: "No active tab" });
      chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CAPTURE" }, (resp) => {
        if (resp && resp.capture && resp.capture.text && resp.capture.text.length > 20) {
          return cb({ ok: true, capture: resp.capture });
        }
        try {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const selection = window.getSelection()?.toString().trim();
              const text = selection && selection.length > 20 ? selection : document.body.innerText || "";
              return { text, title: document.title || "", url: location.href };
            },
          }, (results) => {
            const r = results && results[0] && results[0].result;
            if (r && r.text && r.text.length > 20) return cb({ ok: true, capture: r });
            return cb({ ok: false, error: "Could not load page context." });
          });
        } catch (e) {
          cb({ ok: false, error: String(e) });
        }
      });
    });
  }

  function queryRag(query, docId, cb) {
    setStatus("Querying...");
    chrome.runtime.sendMessage({ type: "QUERY_RAG", query, docId }, (resp) => {
      if (!resp) return cb({ ok: false, error: "No response from background" });
      if (!resp.ok) return cb({ ok: false, error: resp.error || JSON.stringify(resp) });
      cb({ ok: true, result: resp.result });
    });
  }

  function handleQueryResponse(qresp) {
    if (!qresp.ok) {
      setStatus("Query failed: " + (qresp.error || JSON.stringify(qresp)));
      appendBubble("Query failed: " + (qresp.error || ""), "assistant");
      return;
    }
    const result = qresp.result;
    const answer = (result && (result.answer || result.text || JSON.stringify(result))) || "No answer";
    appendBubble(answer, "assistant");
    setStatus("Done");
  }

  getPageContext((res) => {
    if (res.ok) {
      setStatus(`Page context loaded (${Math.min(99999, res.capture.text.length)} chars)`);
      appendBubble("Page content loaded. Ask any question about this page.", "assistant");
      window.__pageCapture = res.capture;
    } else {
      setStatus(res.error || "No page context available");
      appendBubble("Could not load page context.", "assistant");
    }
  });

  // Ingest button removed from UI; Ask flow will auto-ingest when needed.

  askBtn.addEventListener("click", async () => {
    const q = (questionEl.value || "").trim();
    if (!q) return;
    appendBubble(q, "user");
    questionEl.value = "";
    setStatus("Preparing...");

    // Determine the current active tab URL, then look up a stored docId for that URL.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      const currentUrl = tab?.url || '';
      // Use a mapping object stored under `lastIngestedByUrl` to avoid stale docIds across tabs
      chrome.storage.local.get(['lastIngestedByUrl'], (r) => {
        const map = (r && r.lastIngestedByUrl) || {};
        const storedDocId = map[currentUrl] ?? null;
        if (storedDocId) {
          queryRag(q, storedDocId, handleQueryResponse);
          return;
        }

        // No cached doc for this URL — ingest the active tab, then store mapping
        setStatus('No doc cached for this tab — ingesting first...');
        chrome.runtime.sendMessage({ type: 'INGEST_ACTIVE_TAB' }, (ingResp) => {
          if (!ingResp || !ingResp.ok) {
            setStatus('Ingest failed: ' + (ingResp?.error || JSON.stringify(ingResp)));
            appendBubble('Ingest failed: ' + (ingResp?.error || ''), 'assistant');
            return;
          }
          const docId = ingResp.docId ?? ingResp.meta?.docId ?? null;
          const captureUrl = ingResp.captureUrl || currentUrl || '';
          // update mapping
          const newMap = Object.assign({}, map);
          if (captureUrl && docId) newMap[captureUrl] = docId;
          chrome.storage.local.set({ lastIngestedByUrl: newMap }, () => {
            // proceed to query
            queryRag(q, docId, handleQueryResponse);
          });
        });
      });
    });
  });

  questionEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askBtn.click();
    }
  });
});
