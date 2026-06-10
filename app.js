let audioCtx;
let analyser;
let mediaSource;
let dataArr;
let bufLen;
let isPlaying = false;
let rafId = null;
let vizMode = "FULL";
let history = [];
let freqAtX = [];
let lastDominantHz = 0;
let srcOpen = false;
let invertHorizontal = false;
let currentAudioLabel = "Chưa có âm thanh";
let exchangeAbortController = null;

const audioEl = document.getElementById("audioEl");
const canvas = document.getElementById("specCanvas");
const ctx = canvas.getContext("2d");

const dom = {
  subtitleText: document.getElementById("subtitleText"),
  bigValue: document.getElementById("bigValue"),
  rateDescription: document.getElementById("rateDescription"),
  exchangeStatus: document.getElementById("exchangeStatus"),
  metaDate: document.getElementById("metaDate"),
  metaTime: document.getElementById("metaTime"),
  metaZone: document.getElementById("metaZone"),
  metaSource: document.getElementById("metaSource"),
  metaStatus: document.getElementById("metaStatus"),
  sourceAmountInput: document.getElementById("sourceAmountInput"),
  targetAmountInput: document.getElementById("targetAmountInput"),
  sourceCurrencySelect: document.getElementById("sourceCurrencySelect"),
  targetCurrencySelect: document.getElementById("targetCurrencySelect"),
  sourceCurrencyMeta: document.getElementById("sourceCurrencyMeta"),
  targetCurrencyMeta: document.getElementById("targetCurrencyMeta"),
  detailLink: document.getElementById("detailLink"),
  playBtn: document.getElementById("playBtn"),
  progressFill: document.getElementById("progressFill"),
  timeCur: document.getElementById("timeCur"),
  timeTot: document.getElementById("timeTot"),
  liveVal: document.getElementById("liveVal"),
  liveDate: document.getElementById("liveDate"),
  yTop: document.getElementById("yTop"),
  yMid1: document.getElementById("yMid1"),
  yMid2: document.getElementById("yMid2"),
  yMid3: document.getElementById("yMid3"),
  yBot: document.getElementById("yBot"),
  crosshair: document.getElementById("crosshair"),
  crosshairDot: document.getElementById("crosshairDot"),
  crosshairBox: document.getElementById("crosshairBox"),
  crosshairVal: document.getElementById("crosshairVal"),
  crosshairLbl: document.getElementById("crosshairLbl"),
  urlStatus: document.getElementById("urlStatus")
};

const LINE_COLOR = "#81c995";
const FILL_TOP = "rgba(129,201,149,0.22)";
const FILL_BOT = "rgba(129,201,149,0)";
const GRID_COLOR = "rgba(255,255,255,0.07)";
const PLAY_ICON = "\u25b6";
const PAUSE_ICON = "\u275a\u275a";
const EXCHANGE_API_BASE = "https://open.er-api.com/v6/latest";
const LOCAL_MEDIA_BACKEND = "http://localhost:5500";
const CLOUD_MEDIA_BACKEND = "https://schzophree-spectrum-idr-backend.hf.space";

const CURRENCY_LIST = [
  { code: "USD", name: "Đô la Mỹ", country: "Hoa Kỳ", symbol: "$", flag: "US", minorUnit: 2 },
  { code: "VND", name: "Đồng Việt Nam", country: "Việt Nam", symbol: "\u20ab", flag: "VN", minorUnit: 0 },
  { code: "IDR", name: "Rupiah Indonesia", country: "Indonesia", symbol: "Rp", flag: "ID", minorUnit: 0 },
  { code: "EUR", name: "Euro", country: "Khu vực đồng Euro", symbol: "\u20ac", flag: "EU", minorUnit: 2 },
  { code: "GBP", name: "Bảng Anh", country: "Vương quốc Anh", symbol: "\u00a3", flag: "GB", minorUnit: 2 },
  { code: "JPY", name: "Yên Nhật", country: "Nhật Bản", symbol: "\u00a5", flag: "JP", minorUnit: 0 },
  { code: "KRW", name: "Won Hàn Quốc", country: "Hàn Quốc", symbol: "\u20a9", flag: "KR", minorUnit: 0 },
  { code: "CNY", name: "Nhân dân tệ", country: "Trung Quốc", symbol: "\u00a5", flag: "CN", minorUnit: 2 },
  { code: "SGD", name: "Đô la Singapore", country: "Singapore", symbol: "S$", flag: "SG", minorUnit: 2 },
  { code: "AUD", name: "Đô la Australia", country: "Australia", symbol: "A$", flag: "AU", minorUnit: 2 },
  { code: "CAD", name: "Đô la Canada", country: "Canada", symbol: "C$", flag: "CA", minorUnit: 2 },
  { code: "CHF", name: "Franc Thụy Sĩ", country: "Thụy Sĩ", symbol: "CHF", flag: "CH", minorUnit: 2 },
  { code: "HKD", name: "Đô la Hong Kong", country: "Hong Kong", symbol: "HK$", flag: "HK", minorUnit: 2 },
  { code: "MYR", name: "Ringgit Malaysia", country: "Malaysia", symbol: "RM", flag: "MY", minorUnit: 2 },
  { code: "THB", name: "Baht Thái", country: "Thái Lan", symbol: "\u0e3f", flag: "TH", minorUnit: 2 },
  { code: "PHP", name: "Peso Philippines", country: "Philippines", symbol: "\u20b1", flag: "PH", minorUnit: 2 },
  { code: "INR", name: "Rupee Ấn Độ", country: "Ấn Độ", symbol: "\u20b9", flag: "IN", minorUnit: 2 },
  { code: "AED", name: "Dirham UAE", country: "Các Tiểu vương quốc Ả Rập Thống nhất", symbol: "AED", flag: "AE", minorUnit: 2 },
  { code: "NZD", name: "Đô la New Zealand", country: "New Zealand", symbol: "NZ$", flag: "NZ", minorUnit: 2 }
];

const currencyMap = Object.fromEntries(CURRENCY_LIST.map((item) => [item.code, item]));

const exchangeState = {
  sourceCode: "USD",
  targetCode: "VND",
  baseAmount: 1,
  rate: null,
  updatedAt: null,
  provider: "ExchangeRate-API",
  status: "loading"
};

audioEl.volume = 0.8;
dom.liveDate.textContent = currentAudioLabel;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;
  bufLen = analyser.frequencyBinCount;
  dataArr = new Uint8Array(bufLen);
  mediaSource = audioCtx.createMediaElementSource(audioEl);
  mediaSource.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function updatePlayButton() {
  dom.playBtn.textContent = isPlaying ? PAUSE_ICON : PLAY_ICON;
}

function setAudioLabel(title, artist = "") {
  const safeTitle = title || "Chưa đặt tên";
  currentAudioLabel = artist ? `${safeTitle} - ${artist}` : safeTitle;
  dom.liveDate.textContent = currentAudioLabel;
}

function loadAudio(url, title, artist) {
  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  audioEl.src = url;
  audioEl.load();
  setAudioLabel(title, artist);

  audioEl.play().then(() => {
    isPlaying = true;
    updatePlayButton();
    if (!rafId) drawLoop();
  }).catch((err) => {
    isPlaying = false;
    updatePlayButton();
    setUrlStatus("error", `Không thể phát audio. ${err.message}. Hãy kiểm tra CORS hoặc thử nguồn audio khác.`);
  });
}

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  setUrlStatus("ok", `Đã tải file: ${file.name}.`);
  loadAudio(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ""), "Tập tin cục bộ");
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 7000, signal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const abortOnExternalSignal = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortOnExternalSignal, { once: true });
    }
  }

  try {
    const response = await fetch(resource, {
      ...rest,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener("abort", abortOnExternalSignal);
    }
  }
}

function getMediaBackendBase(mode = "auto") {
  if (mode === "local") return LOCAL_MEDIA_BACKEND;
  if (mode === "cloud") return CLOUD_MEDIA_BACKEND;

  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const isLanIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
  return isLocalHost || isLanIp ? LOCAL_MEDIA_BACKEND : CLOUD_MEDIA_BACKEND;
}

async function fetchMedia(url, backendMode = "auto", timeout = 7000) {
  const backendBase = getMediaBackendBase(backendMode);
  const response = await fetchWithTimeout(`${backendBase}/api/load-media?url=${encodeURIComponent(url)}`, { timeout });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Không thể xử lý media.");
  }

  setUrlStatus("ok", `Đã tải thành công: ${data.title}`);
  loadAudio(data.streamUrl, data.title, data.artist);
}

async function loadFromUrl() {
  const urlInput = document.getElementById("mediaUrlInput");
  const loadBtn = document.getElementById("mediaLoadBtn");
  const url = urlInput.value.trim();

  if (!url) {
    setUrlStatus("warn", "Hãy nhập liên kết media trước khi tải.");
    return;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    setUrlStatus("error", "Liên kết phải bắt đầu bằng http:// hoặc https://.");
    return;
  }

  setUrlStatus("ok", "Đang thử kết nối máy chủ cục bộ...");
  loadBtn.disabled = true;

  try {
    await fetchMedia(url, "local", 7000);
    urlInput.value = "";
  } catch (localError) {
    console.warn("Local media backend failed:", localError);
    setUrlStatus("warn", "Máy chủ cục bộ không phản hồi. Đang chuyển sang máy chủ cloud...");

    try {
      await fetchMedia(url, "cloud", 20000);
      urlInput.value = "";
    } catch (cloudError) {
      console.warn("Cloud media backend failed:", cloudError);
      setUrlStatus("error", "Không thể tải media từ máy chủ cục bộ hoặc cloud. Hãy thử lại hoặc kiểm tra kết nối mạng.");
    }
  } finally {
    loadBtn.disabled = false;
  }
}

function setUrlStatus(type, text) {
  dom.urlStatus.className = `url-status ${type || ""}`.trim();
  dom.urlStatus.textContent = text;
}

function togglePlay() {
  if (!audioEl.src) {
    setUrlStatus("warn", "Hãy chọn file âm thanh hoặc nhập liên kết media trước.");
    return;
  }

  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (isPlaying) {
    audioEl.pause();
    isPlaying = false;
    updatePlayButton();
    cancelAnimationFrame(rafId);
    rafId = null;
    drawIdle();
  } else {
    audioEl.play();
    isPlaying = true;
    updatePlayButton();
    if (!rafId) drawLoop();
  }
}

function setVolume(value) {
  audioEl.volume = value / 100;
}

function seekAudio(event) {
  if (!audioEl.duration) return;
  const track = event.currentTarget;
  audioEl.currentTime = (event.offsetX / track.clientWidth) * audioEl.duration;
}

function getCurrencyInfo(code) {
  return currencyMap[code] || {
    code,
    name: code,
    country: "Không rõ",
    symbol: code,
    flag: "",
    minorUnit: 2
  };
}

function buildCurrencyOptionLabel(currency) {
  return `${currency.code} - ${currency.name}`;
}

function buildCurrencyMeta(currency) {
  const metaParts = [currency.country, currency.code];
  if (currency.symbol) metaParts.push(currency.symbol);
  return metaParts.join(" \u00b7 ");
}

function populateCurrencyOptions() {
  const optionMarkup = CURRENCY_LIST.map((currency) => (
    `<option value="${currency.code}">${buildCurrencyOptionLabel(currency)}</option>`
  )).join("");

  dom.sourceCurrencySelect.innerHTML = optionMarkup;
  dom.targetCurrencySelect.innerHTML = optionMarkup;
  dom.sourceCurrencySelect.value = exchangeState.sourceCode;
  dom.targetCurrencySelect.value = exchangeState.targetCode;
  syncCurrencyMeta();
}

function syncCurrencyMeta() {
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);
  dom.sourceCurrencyMeta.textContent = buildCurrencyMeta(sourceInfo);
  dom.targetCurrencyMeta.textContent = buildCurrencyMeta(targetInfo);
}

function parseAmountInput(rawValue) {
  const sanitized = String(rawValue || "").trim().replace(/\s+/g, "");
  if (!sanitized) return null;

  let normalized = sanitized;
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  normalized = normalized.replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function formatNumericValue(value, maximumFractionDigits = 2, minimumFractionDigits = 0) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

function formatCurrencyValue(value, currency, options = {}) {
  const minDigits = options.minimumFractionDigits ?? (currency.minorUnit === 0 ? 0 : 2);
  const maxDigits = options.maximumFractionDigits ?? (currency.minorUnit === 0 ? 0 : Math.max(currency.minorUnit, value < 1 ? 4 : 2));

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: Math.min(maxDigits, 4)
  }).format(value);
}

function formatUpdateTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { dateText: "--", timeText: "--", zoneText: "Chưa cập nhật" };
  }

  const dateText = new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short"
  }).format(date).replace(/\./g, "");

  const timeText = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  const zoneText = minutes === "00" ? `GMT${sign}${hours}` : `GMT${sign}${hours}:${minutes}`;

  return { dateText, timeText, zoneText };
}

function setMetaTimestamp(updatedAt) {
  const { dateText, timeText, zoneText } = formatUpdateTimestamp(updatedAt);
  dom.metaDate.textContent = dateText;
  dom.metaTime.textContent = timeText;
  dom.metaZone.textContent = zoneText;
}

function setExchangeStatus(status, message) {
  const statusLabelMap = {
    loading: "Đang tải",
    ready: "Sẵn sàng",
    error: "Lỗi tải"
  };

  exchangeState.status = status;
  dom.metaStatus.className = `gf-meta-status ${status}`;
  dom.metaStatus.textContent = statusLabelMap[status] || "Trạng thái";
  dom.exchangeStatus.className = `exchange-status ${status}`;
  dom.exchangeStatus.textContent = message;
}

function updateDetailLink() {
  const sourceCode = dom.sourceCurrencySelect.value;
  const targetCode = dom.targetCurrencySelect.value;
  dom.detailLink.href = `https://www.google.com/search?q=${encodeURIComponent(`${sourceCode} to ${targetCode}`)}`;
  dom.detailLink.innerHTML = `Xem thêm về cặp ${sourceCode}/${targetCode} <span class="arrow">&#8250;</span>`;
}

function updateConvertedAmount() {
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);
  const amount = parseAmountInput(dom.sourceAmountInput.value);
  exchangeState.baseAmount = amount;

  if (amount === null) {
    dom.targetAmountInput.value = "";
    dom.targetAmountInput.placeholder = "Nhập số tiền hợp lệ";
    return;
  }

  if (exchangeState.rate === null) {
    dom.targetAmountInput.value = "";
    dom.targetAmountInput.placeholder = exchangeState.status === "error" ? "Không có dữ liệu tỷ giá" : "Đang cập nhật tỷ giá";
    return;
  }

  const converted = amount * exchangeState.rate;
  dom.targetAmountInput.value = formatCurrencyValue(converted, targetInfo, {
    minimumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 2,
    maximumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 4
  });
}

function renderExchangeLoading() {
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);

  dom.subtitleText.textContent = `1 ${sourceInfo.name} bằng`;
  dom.bigValue.textContent = "Đang kết nối đến dịch vụ tỷ giá";
  dom.rateDescription.textContent = `${sourceInfo.name} (${sourceInfo.code}) → ${targetInfo.name} (${targetInfo.code})`;
  dom.metaSource.textContent = exchangeState.provider;
  setMetaTimestamp(null);
  dom.targetAmountInput.value = "";
  dom.targetAmountInput.placeholder = "Đang cập nhật tỷ giá";
  updateDetailLink();
  setExchangeStatus("loading", `Đang lấy tỷ giá hiện tại cho cặp ${sourceInfo.code}/${targetInfo.code}...`);
}

function renderExchangeReady() {
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);
  const formattedRate = formatCurrencyValue(exchangeState.rate, targetInfo, {
    minimumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 2,
    maximumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 4
  });

  dom.subtitleText.textContent = `1 ${sourceInfo.name} bằng`;
  dom.bigValue.textContent = `${formattedRate} ${targetInfo.code}`;
  dom.rateDescription.textContent = `${sourceInfo.name} (${sourceInfo.code}) · ${sourceInfo.country} → ${targetInfo.name} (${targetInfo.code}) · ${targetInfo.country}`;
  dom.metaSource.textContent = exchangeState.provider;
  setMetaTimestamp(exchangeState.updatedAt);
  updateDetailLink();
  updateConvertedAmount();
  setExchangeStatus("ready", `Tỷ giá ${sourceInfo.code}/${targetInfo.code} đã được cập nhật.`);
}

function renderExchangeError(message) {
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);

  exchangeState.rate = null;
  exchangeState.updatedAt = null;
  dom.subtitleText.textContent = `Không thể cập nhật cặp ${sourceInfo.code}/${targetInfo.code}`;
  dom.bigValue.textContent = "Không tải được tỷ giá";
  dom.rateDescription.textContent = `${sourceInfo.name} → ${targetInfo.name}. ${message}`;
  dom.metaSource.textContent = exchangeState.provider;
  setMetaTimestamp(null);
  dom.targetAmountInput.value = "";
  dom.targetAmountInput.placeholder = "Không có dữ liệu tỷ giá";
  updateDetailLink();
  setExchangeStatus("error", message);
}

function describeExchangeError(error) {
  if (navigator.onLine === false) {
    return "Trình duyệt đang ngoại tuyến. Hãy kiểm tra kết nối mạng và thử lại.";
  }

  if (error.name === "AbortError") {
    return "";
  }

  if (error.message && /Failed to fetch|NetworkError/i.test(error.message)) {
    return "Không thể kết nối tới API tỷ giá. Vui lòng thử lại sau.";
  }

  return error.message || "Không thể lấy dữ liệu tỷ giá lúc này.";
}

async function fetchExchangeRate() {
  syncCurrencyMeta();
  renderExchangeLoading();

  if (exchangeAbortController) {
    exchangeAbortController.abort();
  }

  exchangeAbortController = new AbortController();
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);

  exchangeState.sourceCode = sourceInfo.code;
  exchangeState.targetCode = targetInfo.code;

  try {
    const response = await fetchWithTimeout(`${EXCHANGE_API_BASE}/${sourceInfo.code}`, {
      cache: "no-store",
      signal: exchangeAbortController.signal,
      timeout: 8000
    });

    if (!response.ok) {
      throw new Error(`API tỷ giá trả về mã lỗi ${response.status}.`);
    }

    const data = await response.json();
    if (data.result !== "success") {
      throw new Error(data["error-type"] || "API tỷ giá không trả về kết quả hợp lệ.");
    }

    const rate = sourceInfo.code === targetInfo.code ? 1 : data.rates?.[targetInfo.code];
    if (typeof rate !== "number") {
      throw new Error(`Không tìm thấy dữ liệu cho ${targetInfo.code}.`);
    }

    exchangeState.rate = rate;
    exchangeState.provider = "ExchangeRate-API";
    exchangeState.updatedAt = data.time_last_update_utc ? new Date(data.time_last_update_utc) : new Date();
    renderExchangeReady();
  } catch (error) {
    if (error.name === "AbortError") return;
    renderExchangeError(describeExchangeError(error));
  }
}

function initializeCurrencyUi() {
  populateCurrencyOptions();
  dom.sourceAmountInput.addEventListener("input", updateConvertedAmount);
  dom.sourceAmountInput.addEventListener("blur", () => {
    const amount = parseAmountInput(dom.sourceAmountInput.value);
    if (amount !== null) {
      dom.sourceAmountInput.value = formatNumericValue(amount, 4, 0);
      updateConvertedAmount();
    }
  });
  dom.sourceCurrencySelect.addEventListener("change", fetchExchangeRate);
  dom.targetCurrencySelect.addEventListener("change", fetchExchangeRate);
  window.addEventListener("online", () => {
    if (exchangeState.status === "error") {
      fetchExchangeRate();
    }
  });
  fetchExchangeRate();
}

async function shareCurrentRate() {
  const sourceInfo = getCurrencyInfo(dom.sourceCurrencySelect.value);
  const targetInfo = getCurrencyInfo(dom.targetCurrencySelect.value);
  const shareText = exchangeState.rate === null
    ? `Spectrum to Currency - ${sourceInfo.code}/${targetInfo.code}`
    : `Spectrum to Currency: 1 ${sourceInfo.code} = ${formatCurrencyValue(exchangeState.rate, targetInfo, {
      minimumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 2,
      maximumFractionDigits: targetInfo.minorUnit === 0 ? 0 : 4
    })} ${targetInfo.code}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Spectrum to Currency",
        text: shareText,
        url: window.location.href
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      setExchangeStatus(exchangeState.status === "error" ? "error" : "ready", "Đã sao chép thông tin tỷ giá vào clipboard.");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Share action failed:", error);
    }
  }
}

audioEl.addEventListener("loadedmetadata", () => {
  dom.timeTot.textContent = fmtTime(audioEl.duration || 0);
});

audioEl.addEventListener("timeupdate", () => {
  const progress = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
  dom.progressFill.style.width = `${progress}%`;
  dom.timeCur.textContent = fmtTime(audioEl.currentTime);
  dom.timeTot.textContent = fmtTime(audioEl.duration || 0);
});

audioEl.addEventListener("ended", () => {
  isPlaying = false;
  updatePlayButton();
  cancelAnimationFrame(rafId);
  rafId = null;
  drawIdle();
});

audioEl.addEventListener("error", () => {
  if (!audioEl.src) return;
  setUrlStatus("error", "Audio không thể đọc được. Hãy thử URL audio khác hoặc tải file trực tiếp.");
});

function fmtTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function resize() {
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(0, wrap.clientWidth - 62);
  const height = Math.max(0, wrap.clientHeight - 20);
  if (!width || !height) return;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawIdle() {
  resize();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  drawGrid(width, height);

  ctx.beginPath();
  ctx.moveTo(0, height * 0.85);
  ctx.lineTo(width, height * 0.85);
  ctx.strokeStyle = "rgba(129,201,149,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(6, height * 0.85, 4, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();

  dom.liveVal.textContent = formatFrequency(lastDominantHz);
  dom.liveDate.textContent = currentAudioLabel;
  freqAtX = [{ hz: lastDominantHz, pct: 0.15, band: "Tần số trội" }];
}

function drawGrid(width, height) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach((factor) => {
    const y = height * factor;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLoop() {
  rafId = requestAnimationFrame(drawLoop);
  analyser.getByteFrequencyData(dataArr);
  resize();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  drawGrid(width, height);

  if (vizMode === "WAVE") drawWave(width, height);
  else if (vizMode === "BASS") drawBass(width, height);
  else if (vizMode === "MAKS") drawMaks(width, height);
  else drawFull(width, height);

  updateHud();
}

function drawFull(width, height) {
  const bins = vizMode === "MID" ? Math.floor(bufLen * 0.08) : Math.floor(bufLen * 0.55);
  const points = [];
  freqAtX = [];

  for (let index = 0; index < bins; index += 1) {
    const x = (index / (bins - 1)) * width;
    const value = dataArr[index] / 255;
    const y = height - height * 0.08 - value * height * 0.84;
    const hz = (index / bufLen) * ((audioCtx ? audioCtx.sampleRate : 44100) / 2);
    points.push([x, y]);
    freqAtX.push({ hz, pct: value, band: getBand(hz) });
  }

  if (invertHorizontal) {
    points.reverse();
    points.forEach((point) => {
      point[0] = width - point[0];
    });
    freqAtX.reverse();
  }

  history.push(points.map((point) => [...point]));
  if (history.length > 5) history.shift();

  const smoothPoints = points.map((point, index) => {
    let sumX = 0;
    let sumY = 0;

    history.forEach((snapshot) => {
      sumX += snapshot[index][0];
      sumY += snapshot[index][1];
    });

    return [sumX / history.length, sumY / history.length];
  });

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, FILL_TOP);
  gradient.addColorStop(1, FILL_BOT);

  ctx.beginPath();
  ctx.moveTo(0, height);
  smoothPoints.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.lineTo(x, y);
    } else {
      const prevX = smoothPoints[index - 1][0];
      const prevY = smoothPoints[index - 1][1];
      ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
    }
  });
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  smoothPoints.forEach(([x, y], index) => {
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevX = smoothPoints[index - 1][0];
      const prevY = smoothPoints[index - 1][1];
      ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
    }
  });
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const lastPoint = smoothPoints[smoothPoints.length - 1];
  ctx.beginPath();
  ctx.arc(lastPoint[0], lastPoint[1], 4.5, 0, Math.PI * 2);
  ctx.fillStyle = LINE_COLOR;
  ctx.fill();
}

function drawWave(width, height) {
  const waveData = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(waveData);
  mapFreqForHover();

  const wavePoints = [];
  waveData.forEach((value, index) => {
    const x = (index / (bufLen - 1)) * width;
    const y = ((value / 128) - 1) * (height * 0.42) + height / 2;
    wavePoints.push([x, y]);
  });

  if (invertHorizontal) {
    wavePoints.reverse();
    wavePoints.forEach((point) => {
      point[0] = width - point[0];
    });
  }

  ctx.beginPath();
  wavePoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  wavePoints.forEach(([x, y], index) => {
    const mirrorY = height - y;
    if (index === 0) ctx.moveTo(x, mirrorY);
    else ctx.lineTo(x, mirrorY);
  });
  ctx.strokeStyle = "rgba(129,201,149,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBass(width, height) {
  const bands = 40;
  const bandWidth = width / bands;
  freqAtX = [];
  const bars = [];

  for (let index = 0; index < bands; index += 1) {
    const dataIndex = Math.floor((index / bands) * (bufLen * 0.15));
    const value = dataArr[dataIndex] / 255;
    const barHeight = value * height * 0.9;
    const x = index * bandWidth;
    const hz = (dataIndex / bufLen) * (audioCtx.sampleRate / 2);
    bars.push({ x, barHeight, bandWidth, hz, value });
    freqAtX.push({ hz, pct: value, band: getBand(hz) });
  }

  if (invertHorizontal) {
    bars.reverse();
    bars.forEach((bar, index) => {
      bar.x = width - (index + 1) * bandWidth;
    });
    freqAtX.reverse();
  }

  bars.forEach((bar) => {
    const gradient = ctx.createLinearGradient(0, height - bar.barHeight, 0, height);
    gradient.addColorStop(0, "rgba(129,201,149,0.8)");
    gradient.addColorStop(1, "rgba(52,168,83,0.3)");
    ctx.fillStyle = gradient;
    ctx.fillRect(bar.x + 1, height - bar.barHeight, bar.bandWidth - 2, bar.barHeight);
  });
}

function drawMaks(width, height) {
  const bands = Math.min(bufLen, 200);
  const bandWidth = width / bands;
  freqAtX = [];
  const bars = [];

  for (let index = 0; index < bands; index += 1) {
    const value = dataArr[index] / 255;
    const barHeight = value * height * 0.92;
    const x = index * bandWidth + 0.5;
    const hz = (index / bufLen) * (audioCtx.sampleRate / 2);
    bars.push({ x, barHeight, bandWidth, hz, value, hue: 130 + (index / bands) * 50 });
    freqAtX.push({ hz, pct: value, band: getBand(hz) });
  }

  if (invertHorizontal) {
    bars.reverse();
    bars.forEach((bar, index) => {
      bar.x = width - (index + 1) * bandWidth + 0.5;
    });
    freqAtX.reverse();
  }

  bars.forEach((bar) => {
    ctx.fillStyle = `hsla(${bar.hue},60%,60%,0.7)`;
    ctx.fillRect(bar.x, height - bar.barHeight, bar.bandWidth - 1, bar.barHeight);
  });
}

function mapFreqForHover() {
  freqAtX = [];
  const bins = Math.floor(bufLen * 0.55);
  for (let index = 0; index < bins; index += 1) {
    const value = dataArr[index] / 255;
    const hz = (index / bufLen) * (audioCtx.sampleRate / 2);
    freqAtX.push({ hz, pct: value, band: getBand(hz) });
  }
}

function updateHud() {
  if (!audioCtx) return;

  const sampleRate = audioCtx.sampleRate;
  let dominantIndex = 0;
  let dominantValue = 0;

  for (let index = 2; index < bufLen; index += 1) {
    if (dataArr[index] > dominantValue) {
      dominantValue = dataArr[index];
      dominantIndex = index;
    }
  }

  const hz = (dominantIndex / bufLen) * (sampleRate / 2);
  lastDominantHz = hz;
  const maxValue = Math.round(avg(0, Math.floor(bufLen * 0.55)) * 100 * 4) || 100;

  dom.liveVal.textContent = formatFrequency(hz);
  dom.liveDate.textContent = currentAudioLabel;
  dom.yTop.textContent = maxValue;
  dom.yMid1.textContent = Math.round(maxValue * 0.75);
  dom.yMid2.textContent = Math.round(maxValue * 0.5);
  dom.yMid3.textContent = Math.round(maxValue * 0.25);
  dom.yBot.textContent = "0";
}

function avg(start, end) {
  let sum = 0;
  for (let index = start; index < end; index += 1) {
    sum += dataArr[index];
  }
  return sum / ((end - start) * 255);
}

function formatFrequency(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return "0 Hz";
  if (hz >= 1000) {
    return `${formatNumericValue(hz / 1000, 1, 0)} kHz`;
  }
  return `${formatNumericValue(hz, 0, 0)} Hz`;
}

function getBand(hz) {
  if (hz < 250) return "Âm trầm";
  if (hz < 2000) return "Trung âm";
  if (hz < 6000) return "Trung cao";
  return "Âm cao";
}

function onChartMove(event) {
  if (!freqAtX.length) return;

  const rect = canvas.getBoundingClientRect();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const mouseX = Math.max(0, Math.min(event.clientX - rect.left, width));
  const ratio = width ? mouseX / width : 0;
  const index = Math.min(Math.floor(ratio * freqAtX.length), freqAtX.length - 1);
  const info = freqAtX[index] || { hz: lastDominantHz, pct: 0.15, band: "Tần số trội" };
  const dotY = height - height * 0.08 - info.pct * height * 0.84;

  dom.crosshair.style.display = "block";
  dom.crosshair.style.left = `${mouseX}px`;
  dom.crosshairDot.style.top = `${Math.max(8, Math.min(dotY, height - 8))}px`;
  dom.crosshairVal.textContent = formatFrequency(info.hz);
  dom.crosshairLbl.textContent = info.band;

  if (mouseX > width * 0.6) dom.crosshairBox.classList.add("flip");
  else dom.crosshairBox.classList.remove("flip");
}

function onChartLeave() {
  dom.crosshair.style.display = "none";
}

function setVizMode(mode, button) {
  vizMode = mode;
  history = [];
  document.querySelectorAll(".gf-tab").forEach((tab) => tab.classList.remove("active"));
  button.classList.add("active");
}

function toggleSrcBody() {
  srcOpen = !srcOpen;
  document.getElementById("srcDrawer").classList.toggle("open", srcOpen);
  document.getElementById("drawerOverlay").classList.toggle("open", srcOpen);
  document.getElementById("menuBtn").classList.toggle("active", srcOpen);
}

function toggleInvertHorizontal() {
  invertHorizontal = !invertHorizontal;
  document.getElementById("invertCheckbox").checked = invertHorizontal;
  if (!isPlaying) {
    resize();
    drawIdle();
  }
}

const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag");
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith("audio/")) {
    setUrlStatus("ok", `Đã tải file: ${file.name}.`);
    loadAudio(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ""), "Tập tin cục bộ");
  }
});

resize();
drawIdle();
initializeCurrencyUi();
updatePlayButton();

window.addEventListener("resize", () => {
  resize();
  if (!isPlaying) drawIdle();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.key === " ") {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.tagName === "SELECT")) {
      return;
    }
    event.preventDefault();
    togglePlay();
  }
});
