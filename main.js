document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    async function getCSRFToken() {
        if (window._csrfToken) return window._csrfToken;
        const res = await fetch('/api/csrf-token', { credentials: 'include' });
        const data = await res.json();
        window._csrfToken = data.csrfToken;
        return data.csrfToken;
    }

    async function getCurrentUser() {
        try {
            const res = await fetch('http://localhost:3000/api/me', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                return data.user || null;
            }
        } catch (e) {
            // сервер недоступен, возвращаем null
        }
        return null;
    }

    let user = await getCurrentUser();

    // Анимация появления секций
    const sections = document.querySelectorAll('.content-section');
    function checkVisibility() {
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= window.innerHeight * 0.8 && rect.bottom >= window.innerHeight * 0.2) {
                section.classList.add('visible');
            }
        });
    }
    setTimeout(checkVisibility, 10);
    window.addEventListener('scroll', checkVisibility);

    // Плавная прокрутка для кнопок
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#register' || targetId === '#vote') {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const offset = targetElement.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                }
            }
        });
    });

    // Замена ссылки "Регистрация" на аватар профиля
    async function setupProfileAvatar() {
        if (!user || user.status !== 'approved') return;
        const navLinks = document.querySelector('.header-links');
        if (!navLinks) return;
        const profileLink = [...navLinks.children].find(link => link.textContent.trim() === 'Регистрация');
        if (!profileLink) return;
        const freshUserRes = await fetch(`http://localhost:3000/api/user-info/${user.civilnumber}`, { credentials: 'include' });
        const freshUserData = await freshUserRes.json();
        const freshUser = freshUserData.success && freshUserData.user ? freshUserData.user : user;
        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'avatar-wrapper';
        avatarWrapper.style.cursor = 'pointer';
        const avatarImg = document.createElement('img');
        avatarImg.src = freshUser.avatar || 'image/profile-empty.png';
        avatarImg.alt = 'Аватар';
        avatarImg.className = 'header-avatar';
        const nameParts = freshUser.fullname.trim().split(/\s+/);
        const userNameSpan = document.createElement('span');
        userNameSpan.textContent = nameParts[1] || nameParts[0];
        userNameSpan.className = 'avatar-name';
        avatarWrapper.append(avatarImg, userNameSpan);
        avatarWrapper.addEventListener('click', () => window.location.href = 'profile.html');
        profileLink.replaceWith(avatarWrapper);
    }
    setupProfileAvatar();

    // Страница профиля
    if (currentPage === 'profile.html') {
        if (!user) {
            window.location.href = 'registration.html';
            return;
        }
        const res = await fetch(`http://localhost:3000/api/user-info/${user.civilnumber}`, { credentials: 'include' });
        const data = await res.json();
        if (!data.success || !data.user) {
            window.location.href = 'registration.html';
            return;
        }
        user = data.user;

        const header = document.querySelector('header');
        if (header) {
            Object.assign(header.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                zIndex: '1000',
            });
        }

        const profileCard = document.getElementById('profile-card');
        if (profileCard) profileCard.style.display = 'none';

        if (user.status === 'pending' || user.status === 'rejected') {
            const messages = {
                pending: `
                    <h3>Ваш профиль находится на проверке</h3>
                    <p>Пожалуйста, обратитесь в сообщество граждан Волерии в социальной сети ВКонтакте, чтобы подтвердить заявку.</p>
                    <div class="action-buttons-wrapper">
                        <div class="action-buttons">
                            <a href="https://vk.com/citizens_volerian" class="action-button">Сообщество ВКонтакте</a>
                        </div>
                    </div>
                `,
                rejected: `
                    <h4 style="color: #dc3545">Ваш запрос на регистрацию профиля был отменён</h4><br>
                    <p style="color: #dc3545;">Пожалуйста, подайте заявку заново или, если вы не согласны с решением, обратитесь к администрации сайта через личные сообщения в сообществе граждан Волерии в социальной сети ВКонтакте.</p>
                    <div class="action-buttons-wrapper" style="justify-content: space-between;">
                        <div class="action-buttons">
                            <a class="action-button" id="resubmit-button">Подать заявку заново</a>
                        </div>
                        <div class="action-buttons">
                            <a href="https://vk.com/citizens_volerian" class="action-button">Сообщество ВКонтакте</a>
                        </div>
                    </div>
                `
            };
            const container = document.createElement('div');
            container.className = 'message';
            container.innerHTML = messages[user.status] || "<p>Ваш профиль ожидает модерации.</p>";
            document.body.appendChild(container);

            if (user.status === 'rejected') {
                document.getElementById('resubmit-button').addEventListener('click', async () => {
                    const csrfToken = await getCSRFToken();
                    await fetch(`http://localhost:3000/api/user/${user.civilnumber}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'X-CSRF-Token': csrfToken }
                    });
                    document.cookie = 'session=; Max-Age=0; path=/;';
                    window.location.href = 'registration.html';
                });
            }
            return;
        }

        if (user.status === 'approved') {
            if (profileCard) {
                profileCard.style.display = 'block';
                requestAnimationFrame(() => profileCard.classList.add('visible'));
            }

            const fullnameElement = document.getElementById('userFullname');
            const civilnumberElement = document.getElementById('userCivilnumber');
            const avatarPreview = document.getElementById('avatarPreview');
            const avatarInput = document.getElementById('avatarInput');

            if (fullnameElement && civilnumberElement && avatarPreview && avatarInput) {
                fullnameElement.textContent = user.fullname;
                civilnumberElement.textContent = user.civilnumber;
                avatarPreview.src = user.avatar || 'image/profile-empty.png';
                avatarInput.value = '';

                avatarInput.addEventListener('change', async function () {
                    const file = avatarInput.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = async function () {
                        const avatar = reader.result;
                        const csrfToken = await getCSRFToken();
                        const res = await fetch('http://localhost:3000/api/update-avatar', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                            body: JSON.stringify({ avatar })
                        });
                        if (res.ok) {
                            const updatedUserRes = await fetch(`http://localhost:3000/api/user-info/${user.civilnumber}`, { credentials: 'include' });
                            const updatedData = await updatedUserRes.json();
                            if (updatedData.success && updatedData.user) {
                                user = updatedData.user;
                                avatarPreview.src = user.avatar || 'image/profile-empty.png';
                                const headerAvatar = document.querySelector('.header-avatar');
                                if (headerAvatar) headerAvatar.src = user.avatar || 'image/profile-empty.png';
                            } else {
                                avatarPreview.src = avatar;
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
    }

    // Страница регистрации
    if (currentPage === 'registration.html') {
        if (user) {
            window.location.href = 'profile.html';
            return;
        }

        const registerForm = document.querySelector('.register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const fullname = document.getElementById('fullname').value.trim();
                const civilnumber = document.getElementById('civilnumber').value.trim();
                const password = document.getElementById('password').value;

                if (!/^[A-Za-zА-Яа-я]{3,}(?:\s+[A-Za-zА-Яа-я]{3,})+$/.test(fullname)) {
                    return showError('ФИО должно содержать минимум два слова, каждое минимум из 3 букв.');
                }
                if (!/^\d{5}$/.test(civilnumber)) {
                    return showError('Гражданский номер должен состоять из 5 цифр.');
                }
                if (!/^(?=.*[A-Za-zА-Яа-я])(?=.*\d).{8,}$/.test(password)) {
                    return showError('Пароль должен быть не менее 8 символов и содержать буквы и цифры.');
                }

                try {
                    const res = await fetch('http://localhost:3000/api/register', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullname, civilnumber, password })
                    });
                    const data = await res.json();
                    if (data.success) {
                        window.location.href = 'profile.html';
                    } else {
                        showError(data.message || 'Ошибка регистрации');
                    }
                } catch {
                    showError('Не удалось подключиться к серверу.');
                }
            });
        }

        function showError(message) {
            document.querySelector('.error-message')?.remove();
            const errorBox = document.createElement('div');
            errorBox.className = 'error-message';
            errorBox.textContent = message;
            Object.assign(errorBox.style, {
                backgroundColor: '#ffe5e5',
                color: '#cc0000',
                padding: '10px',
                borderRadius: '8px',
                marginTop: '12px',
                fontSize: '14px',
                textAlign: 'center',
            });
            registerForm.insertAdjacentElement('afterend', errorBox);
            setTimeout(() => errorBox.remove(), 5000);
        }
    }

    // Анимация формы регистрации
    const form = document.querySelector(".registration-form");
    if (form) {
        requestAnimationFrame(() => {
            form.classList.add("visible");
        });
    }

    // Страница голосования
    if (currentPage === 'vote.html') {
        const votingBlock = document.querySelector('.voting-block');
        const votedMessage = document.getElementById('voted-message');
        const form = document.getElementById('voteForm');

        if (!user || user.status !== 'approved') {
            window.location.href = 'elections.html';
            return;
        }

        if (user.votingStatus === 'vote') {
            votingBlock?.remove();
            votedMessage?.style.setProperty('display', 'block');
            return;
        }

        if (votingBlock) {
            votingBlock.style.display = 'block';
        }

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selected = document.querySelector('input[name="vote"]:checked');
            if (!selected) {
                const errorBox = document.createElement('div');
                errorBox.className = 'error-message';
                errorBox.textContent = 'Пожалуйста, выберите вариант.';
                votingBlock.insertAdjacentElement('afterend', errorBox);
                setTimeout(() => errorBox.remove(), 5000);
                return;
            }

            const csrfToken = await getCSRFToken();
            const res = await fetch('http://localhost:3000/api/vote', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ option: selected.value })
            });
            const data = await res.json();

            if (data.success) {
                votingBlock?.remove();
                votedMessage?.style.setProperty('display', 'block');
            }
        });
    }

    // Выбор варианта голосования
    document.querySelectorAll('.vote-option').forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio?.checked) option.classList.add('selected');
        option.addEventListener('click', function () {
            document.querySelectorAll('.vote-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            radio.checked = true;
        });
    });

    // Предотвращение перехода к голосованию без одобрения
    const voteLink = document.getElementById('vote-link');
    voteLink?.addEventListener('click', (e) => {
        if (!user || user.status !== 'approved') e.preventDefault();
    });

    document.querySelectorAll('.selection-inactive a').forEach(link =>
        link.addEventListener('click', (e) => e.preventDefault())
    );

    const statusBox = document.querySelector(`.status-${user?.status || 'not-found'}`);
    if (statusBox) statusBox.style.display = 'flex';

    // Анимация блока голосований
    const elections = document.querySelector(".elections-block")
    if (elections) {
        requestAnimationFrame(() => {
            elections.classList.add("visible")
        })
    }

    // Страница ошибки
    if (currentPage === 'error.html') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code') || 'Ошибка';
        const message = params.get('message') || 'Произошла непредвиденная ошибка';

        const codeElem = document.getElementById('error-code');
        const messageElem = document.getElementById('error-message');

        if (codeElem) codeElem.textContent = code;
        if (messageElem) messageElem.textContent = decodeURIComponent(message);
    }

    // Анимация страницы ошибки
    const errorContent = document.querySelector(".error-content");
    if (errorContent) {
        requestAnimationFrame(() => {
            errorContent.classList.add("visible");
        });
    }
});
