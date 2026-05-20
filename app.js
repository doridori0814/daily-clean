const state = {
  reports: [],
  filter: 'all',
  selectedDate: null,
  search: '',
};

const labels = { morning: '오전시황', close: '장마감시황' };
const todayLabel = document.querySelector('#todayLabel');
const dateList = document.querySelector('#dateList');
const reportGrid = document.querySelector('#reportGrid');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const filterButtons = document.querySelectorAll('[data-filter]');

todayLabel.textContent = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
}).format(new Date());

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[char]));
}

function rateClass(value = '') {
  const trimmed = String(value).trim();
  if (trimmed.startsWith('+') || trimmed.includes('상승')) return 'up';
  if (trimmed.startsWith('-') || trimmed.includes('하락')) return 'down';
  return '';
}

function matchesSearch(report) {
  if (!state.search) return true;
  const text = [
    report.title,
    report.mainComment,
    report.domesticStocks,
    report.overseasStocks,
    report.majorNews,
    report.summary,
    report.marketMood,
    ...(report.keyPoints || []),
    ...(report.stocks || []).flatMap((stock) => [stock.name, stock.ticker, stock.rate, stock.note]),
  ].join(' ').toLowerCase();
  return text.includes(state.search.toLowerCase());
}

function getVisibleReports() {
  return state.reports.filter((report) => {
    const filterOk = state.filter === 'all' || report.type === state.filter;
    const dateOk = !state.selectedDate || report.date === state.selectedDate;
    return filterOk && dateOk && matchesSearch(report);
  });
}

function renderDates() {
  const dates = [...new Set(state.reports.map((report) => report.date))].sort().reverse();
  if (!state.selectedDate && dates.length) state.selectedDate = dates[0];

  dateList.innerHTML = [
    `<button class="date-button ${state.selectedDate === null ? 'is-active' : ''}" data-date="all">전체 날짜</button>`,
    ...dates.map((date) => `<button class="date-button ${state.selectedDate === date ? 'is-active' : ''}" data-date="${date}">${formatDate(date)}</button>`)
  ].join('');

  dateList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedDate = button.dataset.date === 'all' ? null : button.dataset.date;
      render();
    });
  });
}

function renderStocks(stocks = []) {
  if (!stocks.length) return '<p class="meta">등록된 특징 종목이 없습니다.</p>';
  return `
    <div class="stock-list">
      ${stocks.map((stock) => {
        const movement = rateClass(stock.rate);
        return `
          <article class="stock-item ${movement}">
            <div class="stock-item-head">
              <div>
                <strong class="stock-name">${escapeHtml(stock.name || '종목명 없음')}</strong>
                <span class="stock-ticker">${escapeHtml(stock.ticker)}</span>
              </div>
              <span class="stock-rate ${movement}">${escapeHtml(stock.rate)}</span>
            </div>
            <p class="stock-note">${escapeHtml(stock.note || '특징 설명이 없습니다.')}</p>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderReport(report) {
  const mainComment = report.mainComment || report.summary || '';
  const domesticStocks = report.domesticStocks || report.marketMood || '';
  const overseasStocks = report.overseasStocks || '';
  const majorNews = report.majorNews || (report.keyPoints || []).join('\n');

  return `
    <article class="report-card">
      <div class="report-head">
        <div>
          <span class="report-type">${labels[report.type]}</span>
          <h2 class="report-title">${escapeHtml(report.title)}</h2>
          <div class="meta">${formatDate(report.date)} · 마지막 업데이트 ${new Date(report.updatedAt).toLocaleString('ko-KR')}</div>
        </div>
        <a class="report-type" href="${report.pdfPath}" target="_blank" rel="noopener">PDF 열기</a>
      </div>
      <div class="report-body">
        <div class="report-info">
          <div class="info-block"><h3>주요 코멘트</h3><p class="summary">${escapeHtml(mainComment || '등록된 주요 코멘트가 없습니다.')}</p></div>
          <div class="info-block"><h3>국내주식</h3><p class="summary">${escapeHtml(domesticStocks || '등록된 국내주식 코멘트가 없습니다.')}</p></div>
          <div class="info-block"><h3>해외주식</h3><p class="summary">${escapeHtml(overseasStocks || '등록된 해외주식 코멘트가 없습니다.')}</p></div>
          <div class="info-block"><h3>주요 뉴스</h3><p class="summary">${escapeHtml(majorNews || '등록된 주요 뉴스가 없습니다.')}</p></div>
          <div class="info-block"><h3>특징 종목</h3>${renderStocks(report.stocks)}</div>
        </div>
        <div class="pdf-panel">
          <a class="pdf-link" href="${report.pdfPath}" target="_blank" rel="noopener">PDF 새 창에서 보기</a>
          <iframe title="${escapeHtml(report.title)} PDF" src="${report.pdfPath}"></iframe>
        </div>
      </div>
    </article>
  `;
}

function render() {
  renderDates();
  filterButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.filter === state.filter));
  const visible = getVisibleReports();
  emptyState.hidden = state.reports.length !== 0;
  reportGrid.innerHTML = visible.map(renderReport).join('');
  if (state.reports.length && !visible.length) {
    reportGrid.innerHTML = '<div class="empty-state"><h2>조건에 맞는 리서치가 없습니다.</h2><p>검색어나 필터를 조정해보세요.</p></div>';
  }
}

async function loadReports() {
  const response = await fetch('/api/reports');
  state.reports = await response.json();
  render();
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  render();
});

loadReports();
setInterval(loadReports, 30000);
