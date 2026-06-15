const state = {
  meetings: [],
  activeId: null,
  activeFilter: 'Все'
};

const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function formatDate(dateString) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateString));
}

function getFilteredMeetings() {
  if (state.activeFilter === 'Все') return state.meetings;
  return state.meetings.filter(meeting => meeting.tags.includes(state.activeFilter));
}

function renderFilters() {
  const allTags = new Set(['Все']);
  state.meetings.forEach(meeting => meeting.tags.forEach(tag => allTags.add(tag)));
  const target = $('#filters');
  target.innerHTML = '';
  [...allTags].forEach(tag => {
    const btn = el('button', `filter-btn ${tag === state.activeFilter ? 'active' : ''}`, tag);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.activeFilter = tag;
      const filtered = getFilteredMeetings();
      if (!filtered.find(item => item.id === state.activeId)) {
        state.activeId = filtered[0]?.id || state.meetings[0]?.id;
      }
      render();
    });
    target.append(btn);
  });
}

function renderMeetingList() {
  const target = $('#meetingList');
  target.innerHTML = '';
  getFilteredMeetings().forEach(meeting => {
    const card = el('button', `meeting-card ${meeting.id === state.activeId ? 'active' : ''}`);
    card.type = 'button';
    card.addEventListener('click', () => {
      state.activeId = meeting.id;
      render();
    });
    card.innerHTML = `
      <strong>${meeting.title}</strong>
      <small>${formatDate(meeting.date)} · ${meeting.duration}</small>
      <div class="tags">${meeting.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
    `;
    target.append(card);
  });
}

function renderSummary(summary) {
  return `
    <section id="summary">
      <h3 class="section-title">Самое важное</h3>
      <div class="summary-grid">
        ${summary.map((item, index) => `
          <div class="summary-item">
            <span class="summary-num">${index + 1}</span>
            <span>${item}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSections(sections) {
  return `
    <section>
      <h3 class="section-title">Темы созвона</h3>
      <div class="section-grid">
        ${sections.map(section => `
          <article class="section-card" data-type="${section.type}">
            <h3>${section.title}</h3>
            <ul>${section.items.map(item => `<li>${item}</li>`).join('')}</ul>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderActions(actions) {
  const titles = {
    managers: 'Управляющим',
    leadership: 'Загиру / руководству',
    tehnolog: 'По товароведу',
    kemerovo: 'По Кемерово'
  };
  return `
    <section id="actions">
      <h3 class="section-title">Задачи</h3>
      <div class="actions-grid">
        ${Object.entries(actions).map(([key, items]) => `
          <article class="actions-card">
            <h3>${titles[key] || key}</h3>
            <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderRisks(risks) {
  return `
    <section>
      <article class="risk-card">
        <h3>Риски</h3>
        <ul>${risks.map(risk => `<li>${risk}</li>`).join('')}</ul>
      </article>
    </section>
  `;
}

function renderDetail() {
  const meeting = state.meetings.find(item => item.id === state.activeId) || state.meetings[0];
  const target = $('#meetingDetail');
  if (!meeting) {
    target.innerHTML = '<div class="detail-body">Пока нет созвонов.</div>';
    return;
  }
  target.innerHTML = `
    <header class="detail-head">
      <div class="eyebrow">${meeting.tags.join(' / ')}</div>
      <h2>${meeting.title}</h2>
      <div class="meta">${formatDate(meeting.date)} · длительность ${meeting.duration}</div>
    </header>
    <div class="detail-body">
      ${renderSummary(meeting.hero.summary)}
      ${renderSections(meeting.sections)}
      ${renderActions(meeting.actions)}
      ${renderRisks(meeting.risks)}
    </div>
  `;
}

function render() {
  renderFilters();
  renderMeetingList();
  renderDetail();
}

function setupTheme() {
  const saved = localStorage.getItem('sobr-theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('sobr-theme', next);
  });
}

function init() {
  setupTheme();
  state.meetings = window.MEETINGS_DATA || [];
  state.activeId = state.meetings[0]?.id;
  render();
}

try {
  init();
} catch (error) {
  console.error(error);
  $('#meetingDetail').innerHTML = `<div class="detail-body">Не удалось загрузить данные: ${error.message}</div>`;
}
