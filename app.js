// --- State Management ---
let scans = JSON.parse(localStorage.getItem('okh_scans')) || [];
let codeReader = null;
let isScanning = false;
let lastScannedCode = null;
let lastScanTime = 0;

// --- DOM Elements ---
const video = document.getElementById('scanner-video');
const btnStart = document.getElementById('btn-start-scan');
const scanTypeSelect = document.getElementById('scan-type');
const scanList = document.getElementById('scan-list');
const countSpan = document.getElementById('count');
const statusDiv = document.getElementById('status');

// --- Audio Feedback ---
const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='); // Simple beep placeholder

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    // Register Service Worker for offline capability
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
    }
});

// --- Scanner Logic (ZXing for cross-platform reliability) ---
btnStart.addEventListener('click', () => {
    if (isScanning) return;
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    statusDiv.textContent = "Starting camera...";
    
    codeReader.decodeFromVideoDevice(null, 'scanner-video', (result, err) => {
        if (result) {
            handleScan(result.text);
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error(err);
        }
    }).then(() => {
        isScanning = true;
        btnStart.classList.add('hidden');
        statusDiv.textContent = "Scanning...";
    }).catch(err => {
        statusDiv.textContent = "Camera Error. Check permissions.";
        console.error(err);
    });
});

// --- Handle Scan Result ---
function handleScan(code) {
    const now = Date.now();
    
    // Prevent duplicate scans within 3 seconds
    if (code === lastScannedCode && (now - lastScanTime) < 3000) {
        return;
    }
    
    lastScannedCode = code;
    lastScanTime = now;

    // Vibrate and Beep
    if (navigator.vibrate) navigator.vibrate(100);
    beep.play().catch(e => {}); // Ignore autoplay errors

    const scanEntry = {
        id: Date.now(),
        code: code,
        type: scanTypeSelect.value,
        timestamp: new Date().toISOString()
    };

    scans.unshift(scanEntry); // Add to top
    saveData();
    updateUI();
}

// --- UI Updates ---
function updateUI() {
    countSpan.textContent = scans.length;
    scanList.innerHTML = '';
    
    scans.forEach(scan => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${scan.code}</span>
            <span class="tag">${scan.type}</span>
        `;
        scanList.appendChild(li);
    });
}

// --- Data Persistence ---
function saveData() {
    localStorage.setItem('okh_scans', JSON.stringify(scans));
}

// --- Export CSV ---
document.getElementById('btn-export').addEventListener('click', () => {
    if (scans.length === 0) return alert("No data to export");
    
    const headers = "Code,Type,Timestamp\n";
    const csvContent = scans.map(s => `${s.code},${s.type},${s.timestamp}`).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `okh_stock_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
