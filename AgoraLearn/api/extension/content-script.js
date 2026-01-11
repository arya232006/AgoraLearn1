// content-script.js
// Extracts visible text and responds to popup requests

function isPdf() {
  return window.location.href.toLowerCase().endsWith('.pdf') || 
         document.contentType === 'application/pdf' ||
         !!document.querySelector('embed[type="application/pdf"]');
}

async function getPdfBase64(targetUrl) {
  try {
    const u = targetUrl || window.location.href;
    const resp = await fetch(u);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // data:application/pdf;base64,...
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to fetch PDF content", String(e));
    return null;
  }
}

function getVisibleText() {
  if (!document.body) return "";
  const clone = document.body.cloneNode(true);
  // Remove non-content elements to reduce noise
  const toRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, button, input, select, textarea, nav, footer, header');
  toRemove.forEach(n => n.remove());
  return (clone.innerText || "").replace(/\s+/g, ' ').trim();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_PAGE_CAPTURE") {
    const pdf = isPdf();
    const url = window.location.href;
    
    if (pdf) {
      // Try to fetch the PDF content as base64
      // This handles local files (file://) and auth-protected PDFs better than server-side fetch
      
      // Determine the best URL to fetch
      let fetchUrl = url;
      const embed = document.querySelector('embed[type="application/pdf"]');
      if (embed && embed.src) {
        fetchUrl = embed.src;
      }

      getPdfBase64(fetchUrl).then(base64 => {
        sendResponse({
          capture: {
            text: "",
            title: document.title,
            url: url, // Keep original URL for reference
            isPdf: true,
            fileBase64: base64 
          }
        });
      });
      return true; // Indicates async response
    } else {
      sendResponse({
        capture: {
          text: getVisibleText(),
          title: document.title,
          url: url,
          isPdf: false
        }
      });
    }
  }
  // Return false for synchronous response (or if not handling)
  return false;
});
