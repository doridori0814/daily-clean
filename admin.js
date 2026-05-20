const form = document.querySelector('#uploadForm');
const stockRows = document.querySelector('#stockRows');
const addStock = document.querySelector('#addStock');
const stocksInput = document.querySelector('#stocksInput');
const formMessage = document.querySelector('#formMessage');
const fileInput = form.querySelector('input[type="file"]');
const fileName = document.querySelector('#fileName');
const dateInput = form.querySelector('input[name="date"]');
const titleInput = form.querySelector('input[name="title"]');
const typeInput = form.querySelector('select[name="type"]');

dateInput.value = new Date().toISOString().slice(0, 10);

function typeLabel() {
  return typeInput.value === 'morning' ? '오전시황' : '장마감시황';
}

function syncTitlePlaceholder() {
  titleInput.placeholder = `${dateInput.value || '오늘'} ${typeLabel()}`;
}

function escapeAttr(value = '') {
  return String(value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[char]));
}

function addStockRow(stock = {}) {
  const row = document.createElement('div');
  row.className = 'stock-row';
  row.innerHTML = `
    <input data-field="name" type="text" placeholder="종목명" value="${escapeAttr(stock.name || '')}">
    <input data-field="ticker" type="text" placeholder="티커" value="${escapeAttr(stock.ticker || '')}">
    <input data-field="rate" type="text" placeholder="등락률" value="${escapeAttr(stock.rate || '')}">
    <textarea data-field="note" rows="3" placeholder="특징을 자세히 적어주세요.">${escapeAttr(stock.note || '')}</textarea>
    <button class="icon-button" type="button" aria-label="종목 삭제">×</button>
  `;
  row.querySelector('button').addEventListener('click', () => row.remove());
  stockRows.appendChild(row);
}

function collectStocks() {
  return [...stockRows.querySelectorAll('.stock-row')].map((row) => {
    const item = {};
    row.querySelectorAll('[data-field]').forEach((input) => {
      item[input.dataset.field] = input.value.trim();
    });
    return item;
  }).filter((item) => item.name || item.ticker || item.rate || item.note);
}

function setMessage(text, type = '') {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`.trim();
}

addStock.addEventListener('click', () => addStockRow());
fileInput.addEventListener('change', () => {
  fileName.textContent = fileInput.files[0]?.name || '선택된 파일 없음';
});
typeInput.addEventListener('change', syncTitlePlaceholder);
dateInput.addEventListener('change', syncTitlePlaceholder);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  stocksInput.value = JSON.stringify(collectStocks());
  const data = new FormData(form);
  if (!data.get('title')) data.set('title', `${data.get('date')} ${typeLabel()}`);

  setMessage('업로드 중입니다...');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const response = await fetch('/api/reports', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '업로드에 실패했습니다.');
    setMessage('업로드가 완료됐습니다. 독자 화면에 바로 반영됐습니다.', 'success');
    window.setTimeout(() => window.location.href = '/', 900);
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

addStockRow();
syncTitlePlaceholder();
