const noteInput  = document.getElementById('noteInput');
const addBtn     = document.getElementById('addBtn');
const noteList   = document.getElementById('noteList');
const searchInput = document.getElementById('searchInput');
const charCount  = document.getElementById('charCount');

const MAX_LEN = 500;
let notes = [];
let searchQuery = '';

init();

async function init() {
  notes = await loadNotes();
  renderNotes();
}

// ── Storage ──────────────────────────────────────────────
function saveNotes() {
  return new Promise(resolve => {
    chrome.storage.local.set({ oceanNotes: notes }, resolve);
  });
}

function loadNotes() {
  return new Promise(resolve => {
    chrome.storage.local.get('oceanNotes', data => {
      resolve(Array.isArray(data.oceanNotes) ? data.oceanNotes : []);
    });
  });
}

// ── Render ────────────────────────────────────────────────
function renderNotes() {
  const query = searchQuery.toLowerCase();
  const filtered = query
    ? notes.filter(n => n.text.toLowerCase().includes(query))
    : notes;

  noteList.innerHTML = '';

  if (filtered.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = query ? '該当するメモがありません' : 'メモがまだありません';
    noteList.appendChild(p);
    return;
  }

  [...filtered].reverse().forEach(note => {
    const item = buildNoteItem(note);
    noteList.appendChild(item);
  });
}

function buildNoteItem(note) {
  const item = document.createElement('div');
  item.className = 'note-item';
  item.dataset.id = note.id;

  const header = document.createElement('div');
  header.className = 'note-header';

  const textEl = document.createElement('div');
  textEl.className = 'note-text';
  textEl.textContent = note.text;

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon edit';
  editBtn.title = '編集';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => startEdit(note, item));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon delete';
  deleteBtn.title = '削除';
  deleteBtn.textContent = '🗑️';
  deleteBtn.addEventListener('click', () => deleteNote(note.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  header.appendChild(textEl);
  header.appendChild(actions);

  const meta = document.createElement('div');
  meta.className = 'note-meta';
  meta.textContent = formatDate(note.createdAt);

  item.appendChild(header);
  item.appendChild(meta);
  return item;
}

// ── Edit ──────────────────────────────────────────────────
function startEdit(note, item) {
  item.classList.add('editing');
  item.innerHTML = '';

  const textarea = document.createElement('textarea');
  textarea.className = 'note-edit-area';
  textarea.value = note.text;
  textarea.rows = 4;
  textarea.maxLength = MAX_LEN;

  const editActions = document.createElement('div');
  editActions.className = 'edit-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-save';
  saveBtn.textContent = '保存';
  saveBtn.addEventListener('click', () => {
    const newText = textarea.value.trim();
    if (!newText) return;
    note.text = newText;
    note.updatedAt = Date.now();
    saveNotes().then(() => renderNotes());
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'キャンセル';
  cancelBtn.addEventListener('click', () => renderNotes());

  editActions.appendChild(cancelBtn);
  editActions.appendChild(saveBtn);
  item.appendChild(textarea);
  item.appendChild(editActions);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// ── Add ───────────────────────────────────────────────────
addBtn.addEventListener('click', addNote);

noteInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote();
});

noteInput.addEventListener('input', () => {
  const len = noteInput.value.length;
  charCount.textContent = `${len} / ${MAX_LEN}`;
  charCount.classList.toggle('warn', len > MAX_LEN * 0.85);
  addBtn.disabled = len === 0;
});

function addNote() {
  const text = noteInput.value.trim();
  if (!text) return;
  notes.push({ id: Date.now(), text, createdAt: Date.now(), updatedAt: Date.now() });
  saveNotes().then(() => {
    renderNotes();
    noteInput.value = '';
    charCount.textContent = `0 / ${MAX_LEN}`;
    charCount.classList.remove('warn');
    addBtn.disabled = true;
  });
}

// ── Delete ────────────────────────────────────────────────
function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes().then(() => renderNotes());
}

// ── Search ────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderNotes();
});

// ── Util ──────────────────────────────────────────────────
function formatDate(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Initial button state
addBtn.disabled = true;
