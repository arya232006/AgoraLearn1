// background.js
// Handles messages from the popup and proxies requests to the local server
const SERVER_BASE = 'http://localhost:3000';

async function getPageCapture(tabId) {
	return new Promise((resolve) => {
		try {
			// Try content script first
			chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CAPTURE' }, (resp) => {
				if (chrome.runtime.lastError) {
					// Content script might not be injected or page is restricted
					console.warn("Content script error:", chrome.runtime.lastError);
				}
				
				// If we got a valid capture (either text or it's a PDF/URL-based capture)
				if (resp && resp.capture && (
					(resp.capture.text && resp.capture.text.length > 0) || 
					(resp.capture.isPdf && resp.capture.url)
				)) {
					return resolve(resp.capture);
				}
				// Fallback to executeScript
				try {
					chrome.scripting.executeScript(
						{ target: { tabId }, func: () => ({ text: (window.getSelection && window.getSelection().toString()) || document.body?.innerText || '', title: document.title || '', url: location.href }) },
						(results) => {
							try {
								const r = results && results[0] && results[0].result;
								// If fallback text is empty, check if it might be a PDF URL that we can fetch directly
								if ((!r || !r.text) && r.url && r.url.toLowerCase().endsWith('.pdf')) {
									return resolve({ text: '', title: r.title, url: r.url, isPdf: true });
								}
								return resolve(r || { text: '', title: '', url: '' });
							} catch (e) {
								return resolve({ text: '', title: '', url: '' });
							}
						}
					);
				} catch (e) {
					return resolve({ text: '', title: '', url: '' });
				}
			});
		} catch (e) {
			// If sendMessage throws, fall back to executeScript
			try {
				chrome.scripting.executeScript(
					{ target: { tabId }, func: () => ({ text: (window.getSelection && window.getSelection().toString()) || document.body?.innerText || '', title: document.title || '', url: location.href }) },
					(results) => {
						try {
							const r = results && results[0] && results[0].result;
							return resolve(r || { text: '', title: '', url: '' });
						} catch (e2) {
							return resolve({ text: '', title: '', url: '' });
						}
					}
				);
			} catch (e2) {
				return resolve({ text: '', title: '', url: '' });
			}
		}
	});
}

async function proxyIngest(capture) {
	try {
		const body = {
			title: capture.title || '',
			url: capture.url || '',
			content: capture.text || '',
			source: 'extension'
		};
		
		// If we have a PDF but no base64 (content script fetch failed), try fetching here in background
		if (capture.isPdf && !capture.fileBase64 && capture.url) {
			try {
				const resp = await fetch(capture.url);
				if (resp.ok) {
					const blob = await resp.blob();
					const base64 = await new Promise((resolve) => {
						const reader = new FileReader();
						reader.onloadend = () => resolve(reader.result);
						reader.onerror = () => resolve(null);
						reader.readAsDataURL(blob);
					});
					if (base64) {
						body.fileBase64 = base64;
					}
				}
			} catch (e) {
				console.error("Background fetch failed for PDF:", e);
			}
		} else if (capture.fileBase64) {
			body.fileBase64 = capture.fileBase64;
		}

		const doFetch = async (payload) => {
			// If we have a file payload, use multipart/form-data to /api/upload directly
			// This avoids JSON size limits and overhead for large local PDFs
			if (payload.fileBase64) {
				try {
					const formData = new FormData();
					// Convert base64 to Blob
					const base64 = payload.fileBase64;
					const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
					const binaryStr = atob(cleanBase64);
					const len = binaryStr.length;
					const bytes = new Uint8Array(len);
					for (let i = 0; i < len; i++) {
						bytes[i] = binaryStr.charCodeAt(i);
					}
					const blob = new Blob([bytes], { type: 'application/pdf' });
					
					formData.append('file', blob, payload.title ? `${payload.title}.pdf` : 'document.pdf');
					formData.append('title', payload.title || '');
					formData.append('source', 'extension');
					if (payload.url) formData.append('url', payload.url);

					const res = await fetch(`${SERVER_BASE}/api/upload`, {
						method: 'POST',
						body: formData,
					});
					const text = await res.text();
					try {
						const json = JSON.parse(text);
						if (!res.ok) return { ok: false, status: res.status, error: json?.error || text, detail: json };
						return { ok: true, status: res.status, ...json };
					} catch (e) {
						if (!res.ok) return { ok: false, status: res.status, error: text };
						return { ok: true, status: res.status, raw: text };
					}
				} catch (e) {
					console.warn("Multipart upload failed, falling back to JSON proxy...", e);
					// Fallthrough to JSON attempt if blob creation fails (unlikely)
				}
			}

			const res = await fetch(`${SERVER_BASE}/api/extension/ingest`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const text = await res.text();
			try {
				const json = JSON.parse(text);
				if (!res.ok) return { ok: false, status: res.status, error: json?.error || text, detail: json };
				return { ok: true, status: res.status, ...json };
			} catch (e) {
				if (!res.ok) return { ok: false, status: res.status, error: text };
				return { ok: true, status: res.status, raw: text };
			}
		};

		try {
			return await doFetch(body);
		} catch (err) {
			console.warn("Initial ingest failed:", err);
			// If the upload failed (likely size limit or network timeout) and we have a valid HTTP URL,
			// try falling back to sending just the URL and letting the backend fetch it.
			if (body.fileBase64 && body.url && body.url.startsWith('http')) {
				console.log("Retrying ingest with URL only...");
				const fallbackBody = { ...body };
				delete fallbackBody.fileBase64;
				// Ensure we don't send empty content if we removed the file
				if (!fallbackBody.content) fallbackBody.content = ''; 
				return await doFetch(fallbackBody);
			}
			throw err;
		}
	} catch (err) {
		console.error("Proxy ingest failed:", err);
		// Check if it might be a size issue
		if (String(err).includes("Failed to fetch") && capture.fileBase64 && capture.fileBase64.length > 1024 * 1024 * 4) {
			return { ok: false, error: "File too large to upload via extension. Please try a smaller file or use the web app." };
		}
		return { ok: false, error: String(err) };
	}
}

async function proxyQuery(query, docId, replyWithAudio) {
	try {
		const res = await fetch(`${SERVER_BASE}/api/extension/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, docId, replyWithAudio }),
		});
		const text = await res.text();
		try {
			const json = JSON.parse(text);
			if (!res.ok) return { ok: false, status: res.status, error: json?.error || text, detail: json };
			return { ok: true, status: res.status, result: json };
		} catch (e) {
			if (!res.ok) return { ok: false, status: res.status, error: text };
			return { ok: true, status: res.status, result: text };
		}
	} catch (err) {
		return { ok: false, error: String(err) };
	}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (!msg || !msg.type) return false;
	(async () => {
		try {
			if (msg.type === 'INGEST_ACTIVE_TAB') {
				// find active tab
				const tabs = await new Promise((res) => chrome.tabs.query({ active: true, currentWindow: true }, res));
				const tab = tabs && tabs[0];
				if (!tab || !tab.id) return sendResponse({ ok: false, error: 'No active tab' });
				const capture = await getPageCapture(tab.id);
				// Allow if text is present OR if it's a PDF/File capture
				const hasText = capture && capture.text && capture.text.trim().length >= 20;
				const hasFile = capture && (capture.isPdf || capture.fileBase64);
				
				if (!hasText && !hasFile) {
					return sendResponse({ ok: false, error: 'No or insufficient page text to ingest' });
				}
				const result = await proxyIngest(capture);
				// Include the capture URL so the popup can store docId per-URL
				if (result && typeof result === 'object') result.captureUrl = capture.url || '';
				return sendResponse(result);
			}

			if (msg.type === 'QUERY_RAG') {
				const { query, docId, replyWithAudio } = msg;
				if (!query) return sendResponse({ ok: false, error: 'Missing query' });
				const result = await proxyQuery(query, docId, replyWithAudio);
				return sendResponse(result);
			}

			// Unknown message
			return sendResponse({ ok: false, error: 'Unknown message type' });
		} catch (err) {
			return sendResponse({ ok: false, error: String(err) });
		}
	})();
	return true; // indicate we'll call sendResponse asynchronously
});
