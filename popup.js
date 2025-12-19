const select = document.getElementById('langSelect');

// Load saved language
chrome.storage.sync.get(['targetLang'], (res) => {
  if (res.targetLang) select.value = res.targetLang;
});

// Save language on change
select.onchange = () => {
  chrome.storage.sync.set({ targetLang: select.value });
};