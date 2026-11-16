let dbData = null; // Данные справочника загружаются из SQL через API
let currentLang = 'ru';
let userMode = 'guest';
let gameScore = 0;
let quizIndex = 0;
let quizScore = 0;

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('welcome-modal');
    const langBtnRu = document.getElementById('lang-btn-ru');
    const langBtnKz = document.getElementById('lang-btn-kz');
    const modeLoginBtn = document.getElementById('btn-login-mode');
    const modeGuestBtn = document.getElementById('btn-guest-mode');
    const authForm = document.getElementById('auth-form');
    const startAppBtn = document.getElementById('start-app-btn');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const authTitle = document.getElementById('auth-title');
    const authMessage = document.getElementById('auth-message');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const passwordToggle = document.getElementById('toggle-password');
    const authHelp = document.getElementById('auth-help');
    // New visitors see registration first; existing users can switch to login.
    let authAction = 'register';

    function setAuthMessage(message, success = false) {
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.style.color = success ? '#65e6a5' : '#ff9c9c';
        }
    }

    function updateAuthMode() {
        if (authTitle) authTitle.textContent = authAction === 'login'
            ? (currentLang === 'ru' ? 'Войти в аккаунт' : 'Аккаунтқа кіру')
            : (currentLang === 'ru' ? 'Создать аккаунт' : 'Аккаунт тіркеу');
        if (authSubmitBtn) authSubmitBtn.textContent = authAction === 'login'
            ? (currentLang === 'ru' ? 'Войти' : 'Кіру')
            : (currentLang === 'ru' ? 'Зарегистрироваться' : 'Тіркелу');
        if (authSwitchBtn) authSwitchBtn.textContent = authAction === 'login'
            ? (currentLang === 'ru' ? 'Регистрация' : 'Тіркелу')
            : (currentLang === 'ru' ? 'Уже есть аккаунт? Войти' : 'Аккаунтыңыз бар ма? Кіру');
        if (usernameInput) { usernameInput.placeholder = currentLang === 'ru' ? 'Email (например, name@example.com)' : 'Email (мысалы, name@example.com)'; usernameInput.type = 'email'; usernameInput.autocomplete = 'email'; }
        if (passwordInput) {
            passwordInput.placeholder = currentLang === 'ru' ? 'Пароль' : 'Құпиясөз';
            passwordInput.autocomplete = authAction === 'register' ? 'new-password' : 'current-password';
        }
        if (authHelp) authHelp.textContent = currentLang === 'ru'
            ? (authAction === 'register' ? 'Новый пользователь? Введи email и придумай пароль, затем нажми «Зарегистрироваться». Если аккаунт уже есть — нажми «Уже есть аккаунт? Войти».' : 'Введи email и пароль, которые указала при регистрации. Если аккаунта ещё нет — нажми «Регистрация».')
            : (authAction === 'register' ? 'Жаңа пайдаланушы болсаң, email мен құпиясөз енгізіп, «Тіркелу» батырмасын бас. Аккаунтың бар болса — «Кіру» таңда.' : 'Тіркелген кезде қолданған email мен құпиясөзді енгіз. Аккаунтың болмаса — «Тіркелу» таңда.');
        if (passwordToggle) {
            const label = currentLang === 'ru' ? (passwordInput && passwordInput.type === 'text' ? 'Скрыть пароль' : 'Показать пароль') : (passwordInput && passwordInput.type === 'text' ? 'Құпиясөзді жасыру' : 'Құпиясөзді көрсету');
            passwordToggle.setAttribute('aria-label', label);
            passwordToggle.title = label;
        }
    }

    function enterSite(username, guest = false) {
        const userDisplay = document.getElementById('user-status-display');
        if (userDisplay) userDisplay.innerText = guest ? (currentLang === 'ru' ? 'Гость' : 'Қонақ') : username;
        if (modal) modal.classList.add('hidden');
        const langDisplay = document.getElementById('current-lang');
        if (langDisplay) langDisplay.innerText = currentLang.toUpperCase();
        applyTranslations();
        initAppData();
    }

    if (langBtnRu && langBtnKz) {
        langBtnRu.onclick = () => { currentLang = 'ru'; langBtnRu.className = 'btn active-cyan'; langBtnKz.className = 'btn btn-dark'; updateAuthMode(); };
        langBtnKz.onclick = () => { currentLang = 'kz'; langBtnKz.className = 'btn active-cyan'; langBtnRu.className = 'btn btn-dark'; updateAuthMode(); };
    }

    if (modeLoginBtn && modeGuestBtn) {
        modeLoginBtn.onclick = () => {
            userMode = 'login';
            modeLoginBtn.className = 'btn active-cyan';
            modeGuestBtn.className = 'btn btn-dark';
            if (authForm) authForm.classList.remove('hidden');
            if (startAppBtn) startAppBtn.classList.add('hidden');
            setAuthMessage('');
            updateAuthMode();
        };
        modeGuestBtn.onclick = () => {
            userMode = 'guest';
            modeGuestBtn.className = 'btn active-cyan';
            modeLoginBtn.className = 'btn btn-dark';
            if (authForm) authForm.classList.add('hidden');
            if (startAppBtn) startAppBtn.classList.remove('hidden');
            setAuthMessage('');
        };
    }

    if (passwordToggle && passwordInput) {
        passwordToggle.onclick = () => {
            const show = passwordInput.type === 'password';
            passwordInput.type = show ? 'text' : 'password';
            updateAuthMode();
            passwordInput.focus();
        };
    }

    if (authSwitchBtn) {
        authSwitchBtn.onclick = () => {
            authAction = authAction === 'login' ? 'register' : 'login';
            setAuthMessage('');
            updateAuthMode();
        };
    }

    if (authSubmitBtn) {
        authSubmitBtn.onclick = async () => {
            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            if (!username || !password) {
                setAuthMessage(currentLang === 'ru' ? 'Введи email и пароль.' : 'Email мен құпиясөзді енгіз.');
                return;
            }
            authSubmitBtn.disabled = true;
            try {
                const response = await fetch(authAction === 'register' ? '/api/register' : '/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: username, password })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Ошибка авторизации');
                enterSite(result.username, false);
            } catch (error) {
                setAuthMessage(error.message || (currentLang === 'ru' ? 'Не удалось подключиться к серверу.' : 'Серверге қосылу мүмкін болмады.'));
            } finally {
                authSubmitBtn.disabled = false;
            }
        };
    }

    if (startAppBtn && modal) {
        startAppBtn.onclick = () => enterSite('', true);
    }

    fetch('/api/me').then(r => r.json()).then(result => {
        if (result.authenticated && result.user) enterSite(result.user.username, false);
    }).catch(() => {});

    fetch('/api/data')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось получить данные из базы');
            return response.json();
        })
        .then(data => {
            dbData = data;
            initAppData();
        })
        .catch(error => {
            console.error(error);
            const grid = document.getElementById('articles-grid');
            if (grid) grid.innerHTML = '<p>Не удалось загрузить материалы. Запусти сайт через npm.cmd start.</p>';
        });

    updateAuthMode();

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.onclick = () => {
            currentLang = currentLang === 'ru' ? 'kz' : 'ru';
            const langDisplay = document.getElementById('current-lang');
            if (langDisplay) langDisplay.innerText = currentLang.toUpperCase();
            applyTranslations();
            initAppData();
        };
    }

    const range = document.getElementById('pass-range');
    if (range) {
        range.oninput = (e) => {
            const lenNum = document.getElementById('len-num');
            if (lenNum) lenNum.innerText = e.target.value;
            genPass();
        };
    }

    const genBtn = document.getElementById('btn-gen-pass');
    if (genBtn) genBtn.onclick = genPass;

    const copyBtn = document.getElementById('btn-copy-pass');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const out = document.getElementById('pass-out');
            if (out) {
                out.select();
                navigator.clipboard.writeText(out.value);
                alert(currentLang === 'ru' ? 'Пароль успешно скопирован!' : 'Құпия сөз сәтті көшірілді!');
            }
        };
    }

    const searchInput = document.getElementById('article-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            if (typeof dbData !== 'undefined' && dbData.articles) {
                const filtered = dbData.articles.filter(item => 
                    item.title[currentLang].toLowerCase().includes(val) || 
                    item.desc[currentLang].toLowerCase().includes(val)
                );
                renderArticles(filtered);
            }
        };
    }

    genPass();
});

function initAppData() {
    if (typeof dbData !== 'undefined') {
        if (dbData.articles) renderArticles(dbData.articles);
        if (dbData.quiz) renderQuiz();
    }
}

function renderArticles(articlesArray) {
    const grid = document.getElementById('articles-grid');
    if (!grid || !articlesArray) return;

    grid.innerHTML = articlesArray.map(item => `
        <div class="article-card" data-category="${item.category}" onclick="openDetail('${item.id}')">
            <div class="art-img-box"><img src="${item.img}" alt="Article"></div>
            <div class="art-content">
                <h3>${item.title[currentLang]}</h3>
                <p>${item.desc[currentLang]}</p>
                <div class="art-footer">
                    <span class="badge-blue">${item.category === 'scam' ? (currentLang === 'ru' ? 'Мошенничество' : 'Алаяқтық') : item.category === 'viruses' ? (currentLang === 'ru' ? 'Вирусы' : 'Вирустар') : (currentLang === 'ru' ? 'Защита данных' : 'Деректерді қорғау')}</span>
                    <span class="arrow-btn">→</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterArticles(category, btnElement) {
    document.querySelectorAll('.category-tags .tag-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (typeof dbData !== 'undefined' && dbData.articles) {
        if (category === 'all') {
            renderArticles(dbData.articles);
        } else {
            const filtered = dbData.articles.filter(item => item.category === category);
            renderArticles(filtered);
        }
    }
}

function switchToolTab(tabIdx) {
    document.querySelectorAll('.tool-tab').forEach((tab, idx) => {
        if (idx === tabIdx) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    for (let i = 0; i < 3; i++) {
        const contentBox = document.getElementById(`tool-content-${i}`);
        if (contentBox) {
            if (i === tabIdx) contentBox.classList.remove('hidden');
            else contentBox.classList.add('hidden');
        }
    }
}

function checkPasswordStrength() {
    const checkInp = document.getElementById('check-input');
    const res = document.getElementById('strength-result');
    if (!checkInp || !res) return;
    
    const val = checkInp.value;
    if (!val) {
        res.innerText = currentLang === 'ru' ? "Введите пароль выше" : "Құпия сөзді енгізіңіз";
        res.style.color = "var(--cyan-main)";
        return;
    }
    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 2) {
        res.innerText = currentLang === 'ru' ? "⚠️ Слабый пароль" : "⚠️ Әлсіз құпия сөз";
        res.style.color = "#ef4444";
    } else if (score <= 4) {
        res.innerText = currentLang === 'ru' ? "⚡ Средний пароль" : "⚡ Орташа құпия сөз";
        res.style.color = "#f59e0b";
    } else {
        res.innerText = currentLang === 'ru' ? "🛡️ Надежный пароль!" : "🛡️ Сенімді құпия сөз!";
        res.style.color = "#10b981";
    }
}

function showContactModal() {
    const modalContent = document.getElementById('detail-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
        <h3 class="detail-title">${currentLang === 'ru' ? 'Связаться с нами' : 'Байланысу'}</h3>
        <p class="detail-text">${currentLang === 'ru' ? 'По вопросам сотрудничества и предложений пишите на email: borambajzanerke@gmail.com' : 'Өз ұсыныстарыңыз бен сұрақтарыңызды мына поштаға жіберіңіз: borambajzanerke@gmail.com'}</p>
        <button class="btn btn-cyan w-100" onclick="closeDetailModal()">${currentLang === 'ru' ? 'Закрыть' : 'Жабу'}</button>
    `;
    const detModal = document.getElementById('detail-modal');
    if (detModal) detModal.classList.remove('hidden');
}

function showAuthorsModal() {
    const modalContent = document.getElementById('detail-modal-content');
    if (!modalContent) return;
    modalContent.innerHTML = `
        <h3 class="detail-title">${currentLang === 'ru' ? 'Авторы проекта' : 'Жоба авторлары'}</h3>
        <p class="detail-text">${currentLang === 'ru' ? 'Курсовой проект разработан автором Жанерке в образовательных целях.' : 'Курстық жобаны білім беру мақсатында автор Жанерке дайындаған.'}</p>
        <button class="btn btn-cyan w-100" onclick="closeDetailModal()">${currentLang === 'ru' ? 'Закрыть' : 'Жабу'}</button>
    `;
    const detModal = document.getElementById('detail-modal');
    if (detModal) detModal.classList.remove('hidden');
}

function openVideo(videoId) {
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
        videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    const vidModal = document.getElementById('video-modal');
    if (vidModal) vidModal.classList.remove('hidden');
}

function closeVideoModal() {
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) videoContainer.innerHTML = '';
    const vidModal = document.getElementById('video-modal');
    if (vidModal) vidModal.classList.add('hidden');
}

function openDetail(id) {
    if (typeof dbData === 'undefined' || !dbData.articles) return;
    const item = dbData.articles.find(art => art.id === id);
    if (!item) return;
    const modalContent = document.getElementById('detail-modal-content');
    if (modalContent) {
        modalContent.innerHTML = `
            <img src="${item.img}" class="detail-img">
            <h3 class="detail-title">${item.title[currentLang]}</h3>
            <p class="detail-text">${item.text[currentLang]}</p>
            <button class="btn btn-cyan w-100" onclick="closeDetailModal()">${currentLang === 'ru' ? 'Закрыть' : 'Жабу'}</button>
        `;
    }
    const detModal = document.getElementById('detail-modal');
    if (detModal) detModal.classList.remove('hidden');
}

function closeDetailModal() {
    const detModal = document.getElementById('detail-modal');
    if (detModal) detModal.classList.add('hidden');
}

function applyTranslations() {
    const trans = {
        ru: {
            "nav-home": "Главная", "nav-base": "База знаний", "nav-tools": "Инструменты", "nav-test": "Тест", "nav-game": "Игра", "nav-videos": "О проекте",
            "hero-title": "ЭЛЕКТРОННЫЙ СПРАВОЧНИК ПО КОМПЬЮТЕРНОЙ БЕЗОПАСНОСТИ", "hero-desc": "Проверенные знания, полезные инструменты и практические советы для вашей цифровой безопасности.",
            "btn-to-articles": "Перейти к статьям →", "btn-pass-test": "Пройти тест",
            "qc-1-title": "База знаний", "qc-1-desc": "Статьи о киберугрозах и способах защиты",
            "qc-2-title": "Инструменты", "qc-2-desc": "Генератор паролей, полезные сервисы",
            "qc-3-title": "Тесты", "qc-3-desc": "Проверьте свои знания о безопасности",
            "qc-4-title": "Интерактивная игра", "qc-4-desc": "Научитесь распознавать угрозы",
            "base-title": "База знаний", "base-sub": "Статьи, советы и материалы о компьютерной безопасности", "search-ph": "Поиск по статьям...",
            "tag-all": "Все", "tag-viruses": "Вирусы", "tag-scam": "Мошенничество", "tag-data": "Защита данных",
            "tools-title": "Инструменты", "tools-sub": "Полезные сервисы для вашей безопасности", "tab-gen": "Генератор паролей", "tab-check": "Проверка пароля", "tab-links": "Полезные ссылки",
            "gen-heading": "Генератор надёжных паролей", "check-heading": "Проверка надежности пароля", "check-ph": "Введите пароль для проверки...",
            "links-heading": "Полезные ресурсы по кибербезопасности",
            "opt-upper": "Буквы (A-Z)", "opt-lower": "Буквы (a-z)", "opt-num": "Цифры (0-9)", "opt-sym": "Символы (!@#$)",
            "pass-len-lbl": "Длина пароля:", "btn-gen-act": "Сгенерировать",
            "test-title": "Тест по кибербезопасности (20 вопросов)", "test-sub": "Проверьте свои знания по цифровой безопасности.",
            "game-title": "Интерактивная игра", "pts-lbl": "Очки:", "game-sub": "Распознавайте угрозы и принимайте правильные решения.",
            "chat-msg-default": "Вы получили сообщение: «Здравствуйте! Ваша учетная запись будет заблокирована. Перейдите по ссылке для подтверждения: http://secure-login.com»",
            "opt-1": "⚪ Перейти по ссылке", "opt-2": "⚪ Проигнорировать сообщение", "opt-3": "⚪ Проверить адрес сайта", "opt-4": "⚪ Сообщить о мошенничестве",
            "vid-section-title": "Обучающие видеоматериалы", "vid-section-sub": "Смотрите подробные ролики по цифровой безопасности",
            "vid-ru-title": "Основы цифровой гигиены (Русский язык)", "vid-kz-title": "Киберқауіпсіздік және интернет алаяқтық (Қазақ тілі)",
            "btn-watch": "Смотреть видео ▶", "btn-watch-kz": "Видеоны қарау ▶",
            "proj-title": "О проекте", "proj-desc": "Электронный справочник по компьютерной безопасности создан в образовательных целях.",
            "btn-contact": "Связаться с нами", "btn-authors": "Авторы проекта",
            "footer-copy": "© 2026 CyberGuide — Электронный справочник по компьютерной безопасности."
        },
        kz: {
            "nav-home": "Басты бет", "nav-base": "Білім базасы", "nav-tools": "Құралдар", "nav-test": "Тест", "nav-game": "Ойын", "nav-videos": "Жоба туралы",
            "hero-title": "КОМПЬЮТЕРЛІК ҚАУІПСІЗДІК БОЙЫНША ЭЛЕКТРОНДЫҚ АНЫҚТАМАЛЫҚ", "hero-desc": "Сенімді білім, пайдалы құралдар және сіздің цифрлық қауіпсіздігіңіз үшін практикалық кеңестер.",
            "btn-to-articles": "Мақалаларға өту →", "btn-pass-test": "Тест тапсыру",
            "qc-1-title": "Білім базасы", "qc-1-desc": "Киберқауіптер және қорғану тәсілдері",
            "qc-2-title": "Құралдар", "qc-2-desc": "Құпия сөз генераторы, пайдалы сервистер",
            "qc-3-title": "Тесттер", "qc-3-desc": "Өз біліміңізді тексеріңіз",
            "qc-4-title": "Интерактивті ойын", "qc-4-desc": "Қауіптерді тануды үйреніңіз",
            "base-title": "Білім базасы", "base-sub": "Компьютерлік қауіпсіздік туралы мақалалар, кеңестер және материалдар", "search-ph": "Мақалаларды іздеу...",
            "tag-all": "Барлығы", "tag-viruses": "Вирустар", "tag-scam": "Алаяқтық", "tag-data": "Деректерді қорғау",
            "tools-title": "Құралдар", "tools-sub": "Қауіпсіздікке арналған пайдалы сервистер", "tab-gen": "Құпия сөз генераторы", "tab-check": "Құпия сөзді тексеру", "tab-links": "Пайдалы сілтемелер",
            "gen-heading": "Сенімді құпия сөздер генераторы", "check-heading": "Құпия сөздің сенімділігін тексеру", "check-ph": "Тексеру үшін құпия сөзді енгізіңіз...",
            "links-heading": "Киберқауіпсіздік бойынша пайдалы ресурстар",
            "opt-upper": "Әріптер (A-Z)", "opt-lower": "Әріптер (a-z)", "opt-num": "Сандар (0-9)", "opt-sym": "Символдар (!@#$)",
            "pass-len-lbl": "Құпия сөз ұзындығы:", "btn-gen-act": "Құпия сөз жасау",
            "test-title": "Киберқауіпсіздік тесті (20 сұрақ)", "test-sub": "Цифрлық қауіпсіздік бойынша біліміңізді тексеріңіз.",
            "game-title": "Интерактивті ойын", "pts-lbl": "Ұпайлар:", "game-sub": "Қауіптерді танып, дұрыс шешім қабылдаңыз.",
            "chat-msg-default": "Сізге хабарлама келді: «Сәлеметсіз бе! Сіздің аккаунтыңыз бұғатталады. Растау үшін сілтемеге өтіңіз: http://secure-login.com»",
            "opt-1": "⚪ Сілтеме бойынша өту", "opt-2": "⚪ Хабарламаны елемеу", "opt-3": "⚪ Сайт мекенжайын тексеру", "opt-4": "⚪ Алаяқтық туралы хабарлау",
            "vid-section-title": "Оқыту видеоматериалдары", "vid-section-sub": "Цифрлық қауіпсіздік бойынша толық видеоларды қараңыз",
            "vid-ru-title": "Основы цифровой гигиены (Русский язык)", "vid-kz-title": "Киберқауіпсіздік және интернет алаяқтық (Қазақ тілі)",
            "btn-watch": "Смотреть видео ▶", "btn-watch-kz": "Видеоны қарау ▶",
            "proj-title": "Жоба туралы", "proj-desc": "Компьютерлік қауіпсіздік бойынша электрондық анықтамалық білім беру мақсатында жасалған.",
            "btn-contact": "Байланысу", "btn-authors": "Жоба авторлары",
            "footer-copy": "© 2026 CyberGuide — Компьютерлік қауіпсіздік бойынша электрондық анықтамалық."
        }
    };

    document.querySelectorAll('[data-translate]').forEach(el => {
        const k = el.getAttribute('data-translate');
        if (trans[currentLang][k]) el.innerText = trans[currentLang][k];
    });
    document.querySelectorAll('[data-translate-holder]').forEach(el => {
        const k = el.getAttribute('data-translate-holder');
        if (trans[currentLang][k]) el.placeholder = trans[currentLang][k];
    });
}

function genPass() {
    const range = document.getElementById('pass-range');
    const chkUp = document.getElementById('chk-upper');
    const chkLow = document.getElementById('chk-lower');
    const chkNum = document.getElementById('chk-num');
    const chkSym = document.getElementById('chk-sym');
    const passOut = document.getElementById('pass-out');

    if (!range || !passOut) return;

    const len = range.value;
    const up = chkUp ? chkUp.checked : true;
    const low = chkLow ? chkLow.checked : true;
    const num = chkNum ? chkNum.checked : true;
    const sym = chkSym ? chkSym.checked : true;

    let chars = '';
    if (up) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (low) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (num) chars += '0123456789';
    if (sym) chars += '!@#$%^&*()_+-=';

    if (!chars) chars = 'abcdef123';
    let res = '';
    for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    passOut.value = res;
}

function playGame(opt) {
    if (opt === 3 || opt === 4) {
        gameScore += 10;
        const scoreElem = document.getElementById('game-score');
        if (scoreElem) scoreElem.innerText = gameScore;
        alert(currentLang === 'ru' ? 'Правильное решение! Угроза предотвращена. +10 очков' : 'Дұрыс шешім! Қауіп жойылды. +10 ұпай');
    } else {
        alert(currentLang === 'ru' ? 'Внимание! Вы перешли по мошеннической ссылке.' : 'Назар аударыңыз! Сіз алаяқтық сілтемеге өтіп кеттіңіз.');
    }
}

function renderQuiz() {
    const wrap = document.getElementById('quiz-content');
    if (!wrap || typeof dbData === 'undefined' || !dbData.quiz) return;

    if (quizIndex < dbData.quiz.length) {
        const item = dbData.quiz[quizIndex];
        wrap.innerHTML = `
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">${currentLang === 'ru' ? 'Вопрос' : 'Сұрақ'} ${quizIndex + 1} / ${dbData.quiz.length}</p>
            <h4 style="font-size:15px; color:#fff; margin-bottom:16px;">${item.q[currentLang]}</h4>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${item.opts[currentLang].map((o, idx) => `
                    <button class="chat-opt-btn" onclick="checkQuiz(${idx})">⚪ ${o}</button>
                `).join('')}
            </div>
        `;
    } else {
        wrap.innerHTML = `
            <div style="text-align:center; padding:15px;">
                <h4 style="color:var(--cyan-main); margin-bottom:10px; font-size:18px;">${currentLang === 'ru' ? 'Тест успешно пройден!' : 'Тест сәтті аяқталды!'}</h4>
                <p style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">${currentLang === 'ru' ? 'Правильных ответов:' : 'Дұрыс жауаптар:'} ${quizScore} / ${dbData.quiz.length}</p>
                <button class="btn btn-cyan" onclick="resetQuiz()">${currentLang === 'ru' ? 'Пройти снова' : 'Қайта өту'}</button>
            </div>
        `;
    }
}

function checkQuiz(idx) {
    if (typeof dbData === 'undefined' || !dbData.quiz) return;
    const item = dbData.quiz[quizIndex];
    if (idx === item.correct) {
        quizScore++;
        alert(currentLang === 'ru' ? 'Верно!' : 'Дұрыс!');
    } else {
        alert(currentLang === 'ru' ? 'Неверно.' : 'Қате.');
    }
    quizIndex++;
    renderQuiz();
}

function resetQuiz() {
    quizIndex = 0;
    quizScore = 0;
    renderQuiz();
}