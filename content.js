let targetLang = 'en';
const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://translate.plausibility.cloud",
  "https://lingva.garudalinux.org",
  "https://lingva.lunar.icu"
];
let currentInstance = 0;

chrome.storage.sync.get(['targetLang'], (res) => {
  if (res.targetLang) targetLang = res.targetLang;
});

// A queue to prevent making too many requests at once
let translationQueue = new Set();

async function runTranslation(element) {
  if (element.dataset.translated || element.innerText.trim().length < 3) return;
  const text = element.innerText.trim();
  if (text.length > 800 || translationQueue.has(text)) return;

  translationQueue.add(text);
  element.dataset.translated = "pending"; // Mark as currently translating

  try {
    const url = `${LINGVA_INSTANCES[currentInstance]}/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(4000) 
    });

    if (response.status === 429) {
      throw new Error("Rate Limited");
    }

    const data = await response.json();
    
    if (data.translation && data.translation.toLowerCase() !== text.toLowerCase()) {
      const box = document.createElement('div');
      box.style = "color: #a3a6aa; font-size: 0.85em; margin-top: 4px; border-left: 2px solid #4f545c; padding-left: 10px;";
      box.innerText = data.translation;
      element.appendChild(box);
      element.dataset.translated = "true";
    }
  } catch (e) {
    // If rate limited or failed, rotate instance and clear the flag to allow retry
    currentInstance = (currentInstance + 1) % LINGVA_INSTANCES.length;
    element.dataset.translated = ""; 
    console.log(`Rotating to instance: ${LINGVA_INSTANCES[currentInstance]}`);
  } finally {
    translationQueue.delete(text);
  }
}

// Optimized scanning with a small delay (Debounce)
let scanTimeout;
function debouncedScan() {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => {
    const targets = document.querySelectorAll('[class*="messageContent"], [id*="message-content"]');
    targets.forEach(runTranslation);
  }, 300); // Wait 300ms after the last change before translating
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some(m => m.addedNodes.length > 0)) {
    debouncedScan();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Also scan on scroll
window.addEventListener('scroll', debouncedScan, true);

console.log("Discord Lingva Translator Active (Stable Mode)");