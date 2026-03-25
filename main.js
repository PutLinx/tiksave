const ENDPOINT = '/api/proxy';

const urlInput = document.getElementById('urlInput');
const btnGo = document.getElementById('btnGo');
const statusEl = document.getElementById('statusEl');
const resultEl = document.getElementById('resultEl');
const videoEl = document.getElementById('videoEl');
const metaTitle = document.getElementById('metaTitle');
const metaDur = document.getElementById('metaDur');
const btnDownload = document.getElementById('btnDownload');
const corsWarn = document.getElementById('corsWarn');
const corsToggle = document.getElementById('corsToggle');
const proxyBox = document.getElementById('proxyBox');
const dlOverlay = document.getElementById('dlOverlay');
const dlText = document.getElementById('dlText');
const dlFill = document.getElementById('dlFill');

let vData = null;

function setStatus(msg, type = 'info') {
  statusEl.className = 'status show ' + type;
  const ico = { info: 'fa-circle-info', error: 'fa-circle-xmark', success: 'fa-circle-check' };
  statusEl.innerHTML = `<i class="fas ${ico[type]}"></i> ${msg}`;
}

function clearStatus() {
  statusEl.className = 'status';
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function fetchVideo(url) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: `url=${encodeURIComponent(url)}&hd=1`
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 0 || !json.data) throw new Error(json.msg || 'Video tidak ditemukan');
  return json.data;
}

function renderResult(data) {
  const videoUrl = data.play;
  const cover = data.cover || '';
  const title = data.title || 'Video TikTok';
  const duration = data.duration || 0;

  if (!videoUrl) throw new Error('URL video tidak ditemukan');

  vData = {
    videoUrl: videoUrl,
    cover: cover,
    title: title,
    dur: duration
  };

  videoEl.poster = cover;
  videoEl.src = videoUrl;
  videoEl.load();

  const t = vData.title;
  metaTitle.textContent = t.length > 55 ? t.slice(0, 55) + '…' : t;
  metaDur.textContent = fmt(vData.dur);

  resultEl.classList.add('show');
  btnDownload.disabled = false;
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  setStatus('✅ Video siap diunduh!', 'success');
}

async function downloadVideoDirect(url, filename) {
  dlOverlay.classList.add('show');
  dlFill.style.width = '0%';
  dlText.textContent = 'Menghubungkan ke server…';
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength) : 0;
    
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    let startTime = Date.now();
    
    dlText.textContent = 'Mengunduh video…';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (total > 0) {
        const percent = Math.round((receivedLength / total) * 100);
        dlFill.style.width = percent + '%';
        
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = receivedLength / elapsed;
        const remaining = total - receivedLength;
        const etaSeconds = remaining / speed;
        
        const mbReceived = (receivedLength / 1024 / 1024).toFixed(1);
        const mbTotal = (total / 1024 / 1024).toFixed(1);
        
        if (etaSeconds > 0 && etaSeconds < 3600) {
          const etaSec = Math.round(etaSeconds);
          const etaMin = Math.floor(etaSec / 60);
          const etaDet = etaSec % 60;
          dlText.textContent = `${mbReceived} MB / ${mbTotal} MB (${percent}%) • ETA: ${etaMin}:${etaDet.toString().padStart(2, '0')}`;
        } else {
          dlText.textContent = `${mbReceived} MB / ${mbTotal} MB (${percent}%)`;
        }
      } else {
        const mbReceived = (receivedLength / 1024 / 1024).toFixed(1);
        const estimatedPercent = Math.min(95, (receivedLength / (1024 * 1024 * 25)) * 100);
        dlFill.style.width = estimatedPercent + '%';
        dlText.textContent = `Mengunduh… ${mbReceived} MB`;
      }
    }
    
    dlFill.style.width = '100%';
    dlText.textContent = 'Menyimpan file…';
    
    const blob = new Blob(chunks, { type: 'video/mp4' });

    if (blob.size < 5000) {
      throw new Error('File terlalu kecil, kemungkinan error download');
    }

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    
    dlOverlay.classList.remove('show');
    setStatus(`✅ Download selesai! File tersimpan sebagai ${filename}`, 'success');
    
  } catch (error) {
    console.error('Download error:', error);
    dlOverlay.classList.remove('show');

    setStatus('⚠️ Gagal download otomatis. Mencoba metode alternatif...', 'info');
    
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus('✅ Download dimulai melalui metode alternatif.', 'success');
    } catch (fallbackError) {
      setStatus('❌ Gagal download. Silakan coba lagi nanti.', 'error');
    }
  }
}

btnGo.addEventListener('click', async () => {
  const raw = urlInput.value.trim();
  if (!raw) { setStatus('Masukkan link TikTok terlebih dahulu.', 'error'); return; }
  if (!raw.includes('tiktok.com')) { setStatus('Link harus dari domain tiktok.com', 'error'); return; }

  resultEl.classList.remove('show');
  vData = null;
  corsWarn.classList.remove('show');
  clearStatus();

  btnGo.disabled = true;
  btnGo.innerHTML = '<span class="spin"></span> Memproses…';
  setStatus('Mengambil data video…');

  try {
    const data = await fetchVideo(raw);
    renderResult(data);
    clearStatus();
  } catch (err) {
    const msg = err.message || '';
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      corsWarn.classList.add('show');
      setStatus('Gagal terhubung ke API. Lihat catatan CORS di atas.', 'error');
    } else {
      setStatus(msg, 'error');
    }
  } finally {
    btnGo.disabled = false;
    btnGo.innerHTML = '<i class="fas fa-arrow-right"></i> <span>Proses</span>';
  }
});

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnGo.click(); });

btnDownload.addEventListener('click', async () => {
  if (!vData) return;
  
  btnDownload.disabled = true;
  const originalText = btnDownload.querySelector('span').textContent;
  btnDownload.querySelector('span').textContent = 'Memulai download…';
  
  setStatus('⏬ Memulai download video...', 'info');
  await downloadVideoDirect(vData.videoUrl, 'tiktok_nowatermark.mp4');
  
  btnDownload.disabled = false;
  btnDownload.querySelector('span').textContent = originalText;
});

corsToggle.addEventListener('click', e => {
  e.preventDefault();
  proxyBox.classList.toggle('show');
  proxyBox.scrollIntoView({ behavior: 'smooth' });
});