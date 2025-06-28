const admin = require('firebase-admin');

let serviceAccount;

// Проверяем, есть ли переменная окружения с Firebase конфигурацией
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Если есть переменная окружения, используем её
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // Для локальной разработки используем файл
    try {
        serviceAccount = require('./firebase-service-account.json');
    } catch (error) {
        console.error('Firebase service account file not found. Please set FIREBASE_SERVICE_ACCOUNT environment variable or add firebase-service-account.json file.');
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db }; 