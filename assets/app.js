const ACCESS_RULES = {
  '1942': { key: 'admin', label: 'Админ', pattern: null },
  '0825': { key: 'tp', label: 'ТП', titlePrefix: 'Созвон ТП' },
  '1516': { key: 'tovarovedy', label: 'Товароведы', titlePrefix: 'Созвон Товароведы' },
  '0174': { key: 'ural', label: 'Урал', titlePrefix: 'Созвон Урал' },
  '9120': { key: 'siberia', label: 'Сибирь', titlePrefix: 'Созвон Сибирь' }
};

const state = {
  allMeetings: [],
  meetings: [],
  activeId: null,
  activeFilter: 'Все',
  role: null,
  titleOverrides: {}
};

const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateString));
}

function loadTitleOverrides() {
  try {
    return JSON.parse(localStorage.getItem('sobr-title-overrides') || '{}');
  } catch (_error) {
    return {};
  }
}

function saveTitleOverrides() {
  localStorage.setItem('sobr-title-overrides', JSON.stringify(state.titleOverrides));
}

function getOriginalTitle(meeting) {
  return meeting.originalTitle || meeting.title || '';
}

function normalizeTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function titleMatchesPrefix(title, prefix) {
  const normalizedTitle = normalizeTitle(title);
  const normalizedPrefix = normalizeTitle(prefix);
  return normalizedTitle === normalizedPrefix || normalizedTitle.startsWith(`${normalizedPrefix} `);
}

function applyTitleOverrides(meeting) {
  const originalTitle = meeting.originalTitle || meeting.title || '';
  return {
    ...meeting,
    originalTitle,
    title: state.titleOverrides[meeting.id] || originalTitle
  };
}

function canRoleSeeMeeting(role, meeting) {
  if (!role) return false;
  if (role.key === 'admin') return true;
  return titleMatchesPrefix(getOriginalTitle(meeting), role.titlePrefix);
}

function setVisibleMeetings() {
  const enriched = state.allMeetings.map(applyTitleOverrides);
  state.meetings = enriched.filter(meeting => canRoleSeeMeeting(state.role, meeting));
  if (!state.meetings.find(item => item.id === state.activeId)) {
    state.activeId = state.meetings[0]?.id || null;
  }
  if (!getAvailableTags().includes(state.activeFilter)) {
    state.activeFilter = 'Все';
  }
}

function getAvailableTags() {
  const allTags = new Set(['Все']);
  state.meetings.forEach(meeting => meeting.tags.forEach(tag => allTags.add(tag)));
  return [...allTags];
}

function getFilteredMeetings() {
  if (state.activeFilter === 'Все') return state.meetings;
  return state.meetings.filter(meeting => meeting.tags.includes(state.activeFilter));
}

function showApp() {
  $('#authScreen')?.classList.add('hidden');
  $('#appShell')?.classList.remove('hidden');
  $('#footer')?.classList.remove('hidden');
}

function showAuth(message = '') {
  $('#authScreen')?.classList.remove('hidden');
  $('#appShell')?.classList.add('hidden');
  $('#footer')?.classList.add('hidden');
  const error = $('#authError');
  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
}

function loginByCode(code) {
  const role = ACCESS_RULES[code.trim()];
  if (!role) {
    showAuth('Неверный код доступа');
    return;
  }
  state.role = role;
  localStorage.setItem('sobr-access-code', code.trim());
  setVisibleMeetings();
  showApp();
  render();
}

function logout() {
  state.role = null;
  state.activeId = null;
  state.activeFilter = 'Все';
  localStorage.removeItem('sobr-access-code');
  renderUserBadge();
  showAuth();
}

function setupAuth() {
  const form = $('#authForm');
  const input = $('#accessCode');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    loginByCode(input?.value || '');
  });
  $('#logoutBtn')?.addEventListener('click', logout);

  const savedCode = localStorage.getItem('sobr-access-code');
  if (savedCode && ACCESS_RULES[savedCode]) {
    loginByCode(savedCode);
  } else {
    showAuth();
  }
}

function renderUserBadge() {
  const badge = $('#userBadge');
  if (!badge) return;
  if (!state.role) {
    badge.textContent = '';
    badge.hidden = true;
    return;
  }
  badge.textContent = state.role.key === 'admin'
    ? 'Доступ: Админ · все созвоны'
    : `Доступ: ${state.role.label} · ${state.meetings.length} созв.`;
  badge.hidden = false;
}

function renderFilters() {
  const target = $('#filters');
  if (!target) return;
  target.innerHTML = '';
  getAvailableTags().forEach(tag => {
    const btn = el('button', `filter-btn ${tag === state.activeFilter ? 'active' : ''}`, tag);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.activeFilter = tag;
      const filtered = getFilteredMeetings();
      if (!filtered.find(item => item.id === state.activeId)) {
        state.activeId = filtered[0]?.id || state.meetings[0]?.id || null;
      }
      render();
    });
    target.append(btn);
  });
}

function renderMeetingList() {
  const target = $('#meetingList');
  if (!target) return;
  target.innerHTML = '';
  const filtered = getFilteredMeetings();
  if (!filtered.length) {
    target.innerHTML = '<div class="empty-state">Нет созвонов для этого доступа или фильтра.</div>';
    return;
  }
  filtered.forEach(meeting => {
    const card = el('button', `meeting-card ${meeting.id === state.activeId ? 'active' : ''}`);
    card.type = 'button';
    card.addEventListener('click', () => {
      state.activeId = meeting.id;
      render();
    });
    card.innerHTML = `
      <strong>${escapeHtml(meeting.title)}</strong>
      <small>${escapeHtml(formatDate(meeting.date))} · ${escapeHtml(meeting.duration)}</small>
      <div class="tags">${meeting.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
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
            <span>${escapeHtml(item)}</span>
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
          <article class="section-card" data-type="${escapeHtml(section.type)}">
            <h3>${escapeHtml(section.title)}</h3>
            <ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
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
    kemerovo: 'По Кемерово',
    support: 'Поддержке',
    training: 'Обучение',
    accounting_control: 'Касса / сверки',
    ural_team: 'Команде Урала',
    accounting: 'Бухгалтерии',
    data_quality: 'Качество данных'
  };
  return `
    <section id="actions">
      <h3 class="section-title">Задачи</h3>
      <div class="actions-grid">
        ${Object.entries(actions).map(([key, items]) => `
          <article class="actions-card">
            <h3>${escapeHtml(titles[key] || key)}</h3>
            <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
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
        <ul>${risks.map(risk => `<li>${escapeHtml(risk)}</li>`).join('')}</ul>
      </article>
    </section>
  `;
}

function renderRenameControls(meeting) {
  if (state.role?.key !== 'admin') return '';
  return `
    <form class="rename-form" id="renameForm">
      <label for="meetingTitleInput">Название созвона</label>
      <div class="rename-row">
        <input id="meetingTitleInput" type="text" value="${escapeHtml(meeting.title)}" autocomplete="off" />
        <button class="secondary-btn compact" type="submit">Переименовать</button>
        <button class="ghost-btn compact" id="resetTitleBtn" type="button">Сбросить</button>
      </div>
      <small>Переименование сохраняется в этом браузере. Исходная категория доступа остаётся по старому названию: ${escapeHtml(getOriginalTitle(meeting))}.</small>
    </form>
  `;
}

function setupRenameControls(meeting) {
  if (state.role?.key !== 'admin') return;
  const form = $('#renameForm');
  const input = $('#meetingTitleInput');
  const resetBtn = $('#resetTitleBtn');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextTitle = input.value.trim();
    if (!nextTitle) return;
    if (nextTitle === getOriginalTitle(meeting)) {
      delete state.titleOverrides[meeting.id];
    } else {
      state.titleOverrides[meeting.id] = nextTitle;
    }
    saveTitleOverrides();
    setVisibleMeetings();
    render();
  });
  resetBtn?.addEventListener('click', () => {
    delete state.titleOverrides[meeting.id];
    saveTitleOverrides();
    setVisibleMeetings();
    render();
  });
}

function renderDetail() {
  const meeting = state.meetings.find(item => item.id === state.activeId) || state.meetings[0];
  const target = $('#meetingDetail');
  if (!target) return;
  if (!meeting) {
    target.innerHTML = '<div class="detail-body">Для этого кода пока нет доступных созвонов.</div>';
    return;
  }
  target.innerHTML = `
    <header class="detail-head">
      <div class="eyebrow">${meeting.tags.map(escapeHtml).join(' / ')}</div>
      <h2>${escapeHtml(meeting.title)}</h2>
      <div class="meta">${escapeHtml(formatDate(meeting.date))} · длительность ${escapeHtml(meeting.duration)}</div>
      ${renderRenameControls(meeting)}
    </header>
    <div class="detail-body">
      ${renderSummary(meeting.hero.summary)}
      ${renderSections(meeting.sections)}
      ${renderActions(meeting.actions)}
      ${renderRisks(meeting.risks)}
    </div>
  `;
  setupRenameControls(meeting);
}

function render() {
  if (!state.role) return;
  setVisibleMeetings();
  renderUserBadge();
  renderFilters();
  renderMeetingList();
  renderDetail();
}

function setupTheme() {
  const saved = localStorage.getItem('sobr-theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  $('#themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('sobr-theme', next);
  });
}

function init() {
  setupTheme();
  state.titleOverrides = loadTitleOverrides();
  state.allMeetings = window.MEETINGS_DATA || [];
  setupAuth();
}

try {
  init();
} catch (error) {
  console.error(error);
  showAuth(`Не удалось загрузить данные: ${error.message}`);
}
