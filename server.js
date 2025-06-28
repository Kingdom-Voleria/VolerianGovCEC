const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { db, admin } = require('./firebase-config');
const app = express();

const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Слишком много запросов, попробуйте позже." }
}));

// Firestore session store
class FirestoreStore extends session.Store {
    constructor() {
        super();
        this.sessions = db.collection('sessions');
    }
    async get(sid, callback) {
        try {
            const doc = await this.sessions.doc(sid).get();
            if (!doc.exists) {
                return callback(null, null);
            }
            const session = doc.data();
            callback(null, session);
        } catch (err) {
            callback(err);
        }
    }
    async set(sid, session, callback) {
        try {
            const sessionData = { ...session };
            await this.sessions.doc(sid).set(sessionData);
            callback();
        } catch (err) {
            callback(err);
        }
    }
    async destroy(sid, callback) {
        try {
            await this.sessions.doc(sid).delete();
            callback();
        } catch (err) {
            callback(err);
        }
    }
}

app.use(session({
    name: 'session',
    secret: 'b7e2c1f8a9d4e6f3c2b1a7e9d8c6f4b2a1e3c5d7b9f2a8c4e6d1b3f5a7c9e2d4',
    resave: false,
    saveUninitialized: false,
    store: new FirestoreStore(),
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 100 * 365 * 24 * 60 * 60 * 1000
    }
}));

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://kingdom-voleria.github.io',
        process.env.RENDER_EXTERNAL_URL,
        process.env.RENDER_EXTERNAL_URL?.replace('https://', 'http://')
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
    if (!req.session.csrfToken || req.query.refresh === 'true') {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }
    res.json({ csrfToken: req.session.csrfToken });
});

function checkCSRF(req, res, next) {
    const token = req.headers['x-csrf-token'];
    if (req.session && req.session.csrfToken && token === req.session.csrfToken) {
        next();
    } else {
        if (!res.headersSent) {
            res.status(403).json({ success: false, message: 'Invalid CSRF token' });
        }
    }
}

app.get('/vote.html', (req, res) => {
    const user = req.session.user;
    if (!user || user.status !== 'approved') {
        return res.redirect('/elections.html');
    }
    return res.sendFile(path.join(__dirname, 'vote.html'));
});

app.use(express.static(path.join(__dirname)));

const usersCollection = db.collection('users');
const votesCollection = db.collection('votes');

// Инициализация коллекции голосов
async function initializeVotes() {
    const votesSnapshot = await votesCollection.get();
    if (votesSnapshot.empty) {
        await votesCollection.doc('option1').set({ count: 0 });
        await votesCollection.doc('option2').set({ count: 0 });
    }
}

initializeVotes().catch(console.error);

function isValidFullname(name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 && parts.every(part => /^[A-Za-zА-Яа-я]{3,}$/.test(part));
}

function isValidCivilnumber(number) {
    return /^\d{5}$/.test(number);
}

function isValidPassword(password) {
    return typeof password === 'string' &&
        password.length >= 8 &&
        /[A-Za-zА-Яа-я]/.test(password) &&
        /\d/.test(password);
}

function saveUserToSession(req, user) {
    req.session.user = {
        fullname: user.fullname,
        civilnumber: user.civilnumber,
        avatar: user.avatar,
        status: user.status,
        votingStatus: user.votingStatus ?? 'novote'
    };
}

// API endpoints

app.get('/api/me', async (req, res) => {
    if (req.session.user) {
        const userDoc = await usersCollection.doc(req.session.user.civilnumber).get();
        if (userDoc.exists) {
            const user = userDoc.data();
            req.session.user = user;
            return res.json({ user });
        }
    }
    res.json({ user: null });
});

app.post('/api/register', async (req, res) => {
    const { fullname, civilnumber, password } = req.body;
    if (!fullname || !civilnumber || !password) {
        return res.status(400).json({ success: false, message: 'Все поля обязательны' });
    }
    if (!isValidFullname(fullname)) {
        return res.status(400).json({ success: false, message: 'ФИО должно содержать минимум два слова, каждое минимум из 3 букв.' });
    }
    if (!isValidCivilnumber(civilnumber)) {
        return res.status(400).json({ success: false, message: 'Гражданский номер должен состоять из 5 цифр.' });
    }
    if (!isValidPassword(password)) {
        return res.status(400).json({ success: false, message: 'Пароль должен быть не менее 8 символов и содержать буквы и цифры.' });
    }

    const existing = await usersCollection.doc(civilnumber).get();
    if (existing.exists) {
        return res.status(400).json({ success: false, message: 'Пользователь уже зарегистрирован' });
    }

    const user = {
        fullname,
        civilnumber,
        avatar: null,
        status: 'pending',
        votingStatus: 'novote',
        password
    };

    await usersCollection.doc(civilnumber).set(user);
    saveUserToSession(req, user);

    res.json({ success: true, message: 'Регистрация прошла успешно', user });
});

app.post('/api/update-avatar', checkCSRF, async (req, res) => {
    const user = req.session.user;
    const { avatar } = req.body;
    if (!user) return res.status(401).json({ success: false, message: 'Нет авторизации' });
    if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Некорректные данные аватара' });
    }

    await usersCollection.doc(user.civilnumber).update({ avatar });
    user.avatar = avatar;
    req.session.user = user;
    res.json({ success: true, message: 'Аватарка обновлена', user });
});

app.get('/api/user-status/:civilnumber', async (req, res) => {
    const { civilnumber } = req.params;
    const userDoc = await usersCollection.doc(civilnumber).get();
    if (!userDoc.exists) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    const user = userDoc.data();
    if (req.session.user && req.session.user.civilnumber === civilnumber) {
        req.session.user.status = user.status;
        req.session.user.votingStatus = user.votingStatus;
    }
    res.json({ success: true, status: user.status, votingStatus: user.votingStatus });
});

app.get('/api/users', async (req, res) => {
    try {
        const usersSnapshot = await usersCollection.get();
        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            delete data.password;
            return data;
        });
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ошибка получения пользователей', error: err.message });
    }
});

app.get('/api/users/pending', async (req, res) => {
    try {
        const usersSnapshot = await usersCollection.where('status', '==', 'pending').get();
        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            delete data.password;
            return data;
        });
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ошибка получения пользователей со статусом pending', error: err.message });
    }
});

app.post('/api/vote', checkCSRF, async (req, res) => {
    const sessionUser = req.session.user;
    const { option } = req.body;
    if (!sessionUser) return res.status(401).json({ success: false, message: 'Нет авторизации' });

    const userDoc = await usersCollection.doc(sessionUser.civilnumber).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    
    const user = userDoc.data();
    if (user.status !== 'approved')
        return res.status(403).json({ success: false, message: 'Пользователь не одобрен для голосования' });
    if (user.votingStatus === 'vote')
        return res.status(400).json({ success: false, message: 'Вы уже голосовали' });

    const voteDoc = await votesCollection.doc(option).get();
    if (!voteDoc.exists)
        return res.status(400).json({ success: false, message: 'Неверный вариант голосования' });

    const batch = db.batch();
    batch.update(votesCollection.doc(option), { count: admin.firestore.FieldValue.increment(1) });
    batch.update(usersCollection.doc(user.civilnumber), { votingStatus: 'vote' });
    await batch.commit();

    req.session.user.votingStatus = 'vote';
    res.json({ success: true, message: 'Голос принят' });
});

app.delete('/api/user/:civilnumber', checkCSRF, async (req, res) => {
    const { civilnumber } = req.params;
    const userDoc = await usersCollection.doc(civilnumber).get();
    if (!userDoc.exists) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    const user = userDoc.data();
    await usersCollection.doc(civilnumber).delete();
    if (req.session.user && req.session.user.civilnumber === civilnumber) req.session.destroy(() => {});
    res.json({ success: true, message: 'Пользователь успешно удалён', user });
});

app.get('/api/user-info/:civilnumber', async (req, res) => {
    const { civilnumber } = req.params;
    const userDoc = await usersCollection.doc(civilnumber).get();
    if (!userDoc.exists) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    const user = userDoc.data();
    delete user.password;
    res.json({ success: true, user });
});

app.get('/api/votes', async (req, res) => {
    const votesSnapshot = await votesCollection.get();
    const formatted = {};
    votesSnapshot.docs.forEach(doc => {
        formatted[doc.id] = doc.data().count;
    });
    res.json({ success: true, votes: formatted });
});

app.delete('/api/votes', checkCSRF, async (req, res) => {
    const batch = db.batch();
    const votesSnapshot = await votesCollection.get();
    votesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { count: 0 });
    });
    await batch.commit();
    res.json({ success: true, message: 'Все результаты голосования были сброшены.' });
});

app.post('/api/reset-voting-status', checkCSRF, async (req, res) => {
    const usersSnapshot = await usersCollection.where('votingStatus', '==', 'vote').get();
    const batch = db.batch();
    usersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { votingStatus: 'novote' });
    });
    await batch.commit();
    res.json({ success: true, message: `Статусы голосования сброшены у ${usersSnapshot.size} пользователей.` });
});

app.post('/api/moderate', async (req, res) => {
    try {
        const { civilnumber, status } = req.body;
        if (!civilnumber || !['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Некорректные данные.' });
        }
        
        const userDoc = await usersCollection.doc(civilnumber).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден.' });
        }
        
        await usersCollection.doc(civilnumber).update({ status: status });
        
        if (req.session.user && req.session.user.civilnumber === civilnumber) {
            req.session.user.status = status;
        }
        
        res.json({ success: true, message: `Статус пользователя обновлён: ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ошибка обновления статуса пользователя', error: err.message });
    }
});

// Error handlers
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        if (!res.headersSent) {
            res.status(404).json({ success: false, message: 'API endpoint not found' });
        }
    } else {
        const errorCode = 404;
        const errorMessage = encodeURIComponent('Страница не найдена');
        if (!res.headersSent) {
            res.redirect(`/error.html?code=${errorCode}&message=${errorMessage}`);
        }
    }
});

app.use((err, req, res, next) => {
    if (req.path && req.path.startsWith('/api/')) {
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    } else {
        const errorCode = 500;
        const errorMessage = encodeURIComponent('Внутренняя ошибка сервера');
        if (!res.headersSent) {
            res.redirect(`/error.html?code=${errorCode}&message=${errorMessage}`);
        }
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});