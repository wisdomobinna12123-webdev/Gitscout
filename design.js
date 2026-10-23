/* =========================================================
   GitScout — GitHub profile finder
   ========================================================= */

/* =========================================================
   THEME TOGGLE
   ========================================================= */
const THEME_KEY = 'gitTheme';
const themeToggle = document.getElementById('themeToggle');
const rootEl = document.documentElement;

function applyTheme(theme) {
    rootEl.setAttribute('data-theme', theme);

    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }

    const isDark = theme === 'dark';

    themeToggle.innerHTML =
        `<i class="fa-solid fa-${isDark ? 'sun' : 'moon'}" aria-hidden="true"></i>`;

    themeToggle.setAttribute(
        'aria-label',
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
    );
}

function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }

    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    applyTheme(theme);
}

themeToggle.addEventListener('click', () => {
    const current = rootEl.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

initTheme();

/* =========================================================
   SEARCH / HISTORY / API
   ========================================================= */
const STORAGE_KEY = 'gitHistory';
const MAX_HISTORY = 8;

// ---------- DOM ----------
const form         = document.getElementById('searchForm');
const input        = document.getElementById('username');
const btn          = document.getElementById('searchBtn');

const profileCard  = document.getElementById('profileCard');
const loader       = document.getElementById('loader');
const messageEl    = document.getElementById('message');

const avatar       = document.getElementById('avatar');
const nameEl       = document.getElementById('name');
const loginEl      = document.getElementById('login');
const bioEl        = document.getElementById('bio');
const badgesEl     = document.getElementById('badges');
const metaEl       = document.getElementById('meta');
const followersEl  = document.querySelector('.followers');
const followingEl  = document.querySelector('.following');
const reposEl      = document.querySelector('.repos');
const gistsEl      = document.querySelector('.gists');
const profileLink  = document.getElementById('profileLink');

const historyPanel = document.getElementById('historyPanel');
const historyList  = document.getElementById('historyList');
const clearBtn     = document.getElementById('clearHistory');

const statusEl     = document.getElementById('status');

// ---------- STATE ----------
let loading = false;
let statusTimer = null;

/* ---------- NETWORK STATUS ---------- */
function showStatus(text, type) {
    statusEl.textContent = text;
    statusEl.classList.remove('online', 'offline');
    statusEl.classList.add(type);

    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        statusEl.classList.remove('online', 'offline');
        statusEl.textContent = '';
    }, 5000);
}

window.addEventListener('online', () =>
    showStatus('Back online, keep up the good work!', 'online')
);

window.addEventListener('offline', () =>
    showStatus('No connection, please check your network settings', 'offline')
);

/* ---------- INLINE MESSAGE ---------- */
function showMessage(text) {
    messageEl.textContent = text;
    messageEl.className = 'message error';
}

function clearMessage() {
    messageEl.textContent = '';
    messageEl.className = 'message';
}

/* ---------- HISTORY ---------- */
function getHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function addToHistory(username) {
    const list = getHistory();

    const index = list.findIndex(
        item => item.toLowerCase() === username.toLowerCase()
    );
    if (index !== -1) list.splice(index, 1);

    list.unshift(username);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list.slice(0, MAX_HISTORY))
    );
}

function renderHistory() {
    const list = getHistory();
    historyList.innerHTML = '';

    list.forEach(username => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'history-item';
        item.textContent = username;

        item.addEventListener('click', () => {
            input.value = username;
            searchUser();
        });

        historyList.appendChild(item);
    });

    historyPanel.classList.toggle('active', list.length > 0);
}

clearBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
});

/* ---------- HELPERS ---------- */
function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}

function formatJoinDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function normalizeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* ---------- RENDER ---------- */
function renderBadges(user) {
    badgesEl.innerHTML = '';
    const badges = [];

    if (user.hireable) {
        badges.push({
            icon: 'fa-solid fa-briefcase',
            text: 'Open to work',
            cls: 'badge badge-hire'
        });
    }

    if (user.type === 'Organization') {
        badges.push({
            icon: 'fa-solid fa-users',
            text: 'Organization',
            cls: 'badge'
        });
    }

    badges.forEach(({ icon, text, cls }) => {
        const span = document.createElement('span');
        span.className = cls;

        const i = document.createElement('i');
        i.className = icon;
        i.setAttribute('aria-hidden', 'true');

        span.appendChild(i);
        span.appendChild(document.createTextNode(text));
        badgesEl.appendChild(span);
    });

    badgesEl.hidden = badges.length === 0;
}

function renderMeta(user) {
    metaEl.innerHTML = '';
    const items = [];

    if (user.location) {
        items.push({ icon: 'fa-solid fa-location-dot', text: user.location });
    }

    if (user.company) {
        items.push({ icon: 'fa-solid fa-building', text: user.company });
    }

    if (user.blog) {
        items.push({
            icon: 'fa-solid fa-link',
            text: user.blog,
            href: normalizeUrl(user.blog)
        });
    }

    if (user.twitter_username) {
        items.push({
            icon: 'fa-brands fa-x-twitter',
            text: `@${user.twitter_username}`,
            href: `https://twitter.com/${user.twitter_username}`
        });
    }

    if (user.email) {
        items.push({
            icon: 'fa-solid fa-envelope',
            text: user.email,
            href: `mailto:${user.email}`
        });
    }

    if (user.created_at) {
        items.push({
            icon: 'fa-solid fa-calendar',
            text: `Joined ${formatJoinDate(user.created_at)}`
        });
    }

    items.forEach(item => {
        const li = document.createElement('li');

        const icon = document.createElement('i');
        icon.className = item.icon;
        icon.setAttribute('aria-hidden', 'true');
        li.appendChild(icon);

        if (item.href) {
            const a = document.createElement('a');
            a.href = item.href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = item.text;
            li.appendChild(a);
        } else {
            const span = document.createElement('span');
            span.textContent = item.text;
            li.appendChild(span);
        }

        metaEl.appendChild(li);
    });

    metaEl.hidden = items.length === 0;
}

function renderProfile(user) {
    avatar.src = user.avatar_url;
    avatar.alt = `${user.login}'s avatar`;

    nameEl.textContent = user.name || user.login;
    loginEl.textContent = `@${user.login}`;
    loginEl.href = user.html_url;

    bioEl.textContent = user.bio || 'No bio provided.';

    followersEl.textContent = formatNumber(user.followers);
    followingEl.textContent = formatNumber(user.following);
    reposEl.textContent     = formatNumber(user.public_repos);
    gistsEl.textContent     = formatNumber(user.public_gists);

    profileLink.href = user.html_url;

    renderBadges(user);
    renderMeta(user);
}

/* ---------- API ---------- */
async function getUser(username) {
    const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`,
        { headers: { Accept: 'application/vnd.github+json' } }
    );

    if (res.status === 404) {
        throw new Error(`"${username}" was not found on GitHub.`);
    }

    if (res.status === 403) {
        throw new Error('GitHub API rate limit reached. Please try again in a minute.');
    }

    if (!res.ok) {
        throw new Error('Could not fetch that profile. Please try again.');
    }

    return res.json();
}

/* ---------- SEARCH ---------- */
async function searchUser() {
    if (loading) return;

    const username = input.value.trim();
    clearMessage();

    if (!username) {
        showMessage('Please provide a GitHub username.');
        input.focus();
        return;
    }

    loading = true;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>';

    loader.classList.add('active');
    profileCard.classList.remove('active');
    historyPanel.classList.remove('active');

    try {
        const user = await getUser(username);
        renderProfile(user);

        addToHistory(user.login || username);
        renderHistory();

        profileCard.classList.add('active');
    } catch (error) {
        showMessage(error.message || 'Something went wrong. Please try again.');
        profileCard.classList.remove('active');
    } finally {
        loading = false;

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-search" aria-hidden="true"></i>';

        loader.classList.remove('active');
    }
}

/* ---------- EVENTS ---------- */
form.addEventListener('submit', event => {
    event.preventDefault();
    searchUser();
});

input.addEventListener('focus', () => {
    if (getHistory().length) historyPanel.classList.add('active');
});

input.addEventListener('keydown', event => {
    if (event.key === 'Escape') historyPanel.classList.remove('active');
});

document.addEventListener('click', event => {
    const insideHistory = historyPanel.contains(event.target);
    const isInput = event.target === input;
    if (!insideHistory && !isInput) {
        historyPanel.classList.remove('active');
    }
});

avatar.addEventListener('error', () => {
    avatar.src =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">' +
            '<rect width="128" height="128" fill="%23d5daf8"/>' +
            '<text x="50%" y="54%" font-size="48" text-anchor="middle" ' +
            'fill="%235050f8" font-family="monospace">?</text></svg>'
        );
});

/* ---------- INIT ---------- */
renderHistory();