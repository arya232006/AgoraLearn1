// background.js
// Handles messages from the popup and proxies requests to the local server
const SERVER_BASE = 'http://localhost:3000';

async function getPageCapture(tabId) {
	return new Promise((resolve) => {
		try {
			// Try content script first
			chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CAPTURE' }, (resp) => {
				if (resp && resp.capture && resp.capture.text && resp.capture.text.length > 0) {
					return resolve(resp.capture);
				}
				// Fallback to executeScript
				try {
					chrome.scripting.executeScript(
						{ target: { tabId }, func: () => ({ text: (window.getSelection && window.getSelection().toString()) || document.body?.innerText || '', title: document.title || '', url: location.href }) },
						(results) => {
							try {
								const r = results && results[0] && results[0].result;
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
		const res = await fetch(`${SERVER_BASE}/api/extension/ingest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: capture.title || '', url: capture.url || '', content: capture.text || '', source: 'extension' }),
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
	} catch (err) {
		return { ok: false, error: String(err) };
	}
}

async function proxyQuery(query, docId) {
	try {
		const res = await fetch(`${SERVER_BASE}/api/extension/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, docId }),
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
				if (!capture || !capture.text || capture.text.trim().length < 20) {
					return sendResponse({ ok: false, error: 'No or insufficient page text to ingest' });
				}
				const result = await proxyIngest(capture);
				// Include the capture URL so the popup can store docId per-URL
				if (result && typeof result === 'object') result.captureUrl = capture.url || '';
				return sendResponse(result);
			}

			if (msg.type === 'QUERY_RAG') {
				const { query, docId } = msg;
				if (!query) return sendResponse({ ok: false, error: 'Missing query' });
				const result = await proxyQuery(query, docId);
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
