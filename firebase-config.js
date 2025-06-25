const admin = require('firebase-admin');

// Здесь нужно будет заменить на путь к вашему JSON файлу с ключами
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db }; 