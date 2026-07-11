const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('dateDisplay');
const alarmList = document.getElementById('alarmList');
const timeInput = document.getElementById('timeInput');
const labelInput = document.getElementById('labelInput');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const stopBtn = document.getElementById('stopBtn');

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

let alarms = loadAlarms();
let audioCtx = null;
let beepInterval = null;
let lastTriggeredKey = null;

renderAlarms();
setInterval(tick, 500);

function tick() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}:${ss}`;

  const wd = WEEKDAYS[now.getDay()];
  dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${wd}）`;

  const key = `${hh}:${mm}`;
  if (ss === '00') {
    const alarm = alarms.find(a => a.enabled && a.time === key);
    if (alarm && lastTriggeredKey !== key) {
      lastTriggeredKey = key;
      triggerAlarm(alarm);
    }
  }
  if (ss !== '00') lastTriggeredKey = null;
}

function triggerAlarm(alarm) {
  modalMessage.textContent = alarm.label ? `${alarm.label}  —  ${alarm.time}` : alarm.time;
  modal.classList.remove('hidden');
  startBeep();
}

function startBeep() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  beepInterval = setInterval(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  }, 700);
}

function stopAlarm() {
  modal.classList.add('hidden');
  if (beepInterval) { clearInterval(beepInterval); beepInterval = null; }
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

stopBtn.addEventListener('click', stopAlarm);

addBtn.addEventListener('click', () => {
  const time = timeInput.value;
  if (!time) { alert('時刻を選択してください'); return; }
  alarms.push({ id: Date.now(), time, label: labelInput.value.trim(), enabled: true });
  saveAlarms();
  renderAlarms();
  timeInput.value = '';
  labelInput.value = '';
});

function renderAlarms() {
  alarmList.innerHTML = '';
  if (alarms.length === 0) {
    alarmList.innerHTML = '<p class="empty-msg">アラームが登録されていません</p>';
    return;
  }
  alarms
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(alarm => {
      const item = document.createElement('div');
      item.className = 'alarm-item' + (alarm.enabled ? ' active' : '');
      item.innerHTML = `
        <div class="alarm-left">
          <span class="alarm-icon">🔔</span>
          <div>
            <div class="alarm-time">${alarm.time}</div>
            ${alarm.label ? `<div class="alarm-label">${escapeHtml(alarm.label)}</div>` : ''}
          </div>
        </div>
        <div class="alarm-controls">
          <label class="toggle">
            <input type="checkbox" ${alarm.enabled ? 'checked' : ''} data-id="${alarm.id}" />
            <span class="slider"></span>
          </label>
          <button class="delete-btn" data-id="${alarm.id}" title="削除">✕</button>
        </div>
      `;
      alarmList.appendChild(item);
    });

  alarmList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = Number(e.target.dataset.id);
      const alarm = alarms.find(a => a.id === id);
      if (alarm) { alarm.enabled = e.target.checked; saveAlarms(); renderAlarms(); }
    });
  });

  alarmList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = Number(e.target.dataset.id);
      alarms = alarms.filter(a => a.id !== id);
      saveAlarms();
      renderAlarms();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

function loadAlarms() {
  try { return JSON.parse(localStorage.getItem('alarms')) || []; }
  catch { return []; }
}
