# Пошаговые инструкции по деплою на Render

## Шаг 1: Подготовка проекта

1. Убедитесь, что все файлы сохранены в Git репозитории
2. Проверьте, что файл `firebase-service-account.json` добавлен в `.gitignore`

## Шаг 2: Настройка Firebase

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект или используйте существующий
3. Включите Firestore Database
4. Получите Service Account Key:
   - Project Settings → Service accounts → Generate new private key
   - Скачайте JSON файл

## Шаг 3: Создание аккаунта на Render

1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь или войдите в аккаунт
3. Подключите ваш GitHub аккаунт

## Шаг 4: Создание Web Service

1. Нажмите "New +" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Настройте параметры:
   - **Name**: `volgovcec` (или любое другое)
   - **Environment**: `Node`
   - **Region**: выберите ближайший к вам
   - **Branch**: `main` (или ваша основная ветка)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

## Шаг 5: Настройка переменных окружения

В настройках сервиса перейдите в "Environment" и добавьте:

### Обязательные переменные:
- **Key**: `NODE_ENV`
- **Value**: `production`

- **Key**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: Вставьте всё содержимое скачанного JSON файла (в одну строку)

### Пример значения FIREBASE_SERVICE_ACCOUNT:
```
{"type":"service_account","project_id":"your-project-id","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"}
```

## Шаг 6: Настройка Firebase правил безопасности

В Firebase Console → Firestore Database → Rules установите:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
    match /users/{userId} {
      allow read, write: if true;
    }
    match /votes/{voteId} {
      allow read, write: if true;
    }
  }
}
```

## Шаг 7: Деплой

1. Нажмите "Create Web Service"
2. Render автоматически начнет сборку и деплой
3. Дождитесь завершения (обычно 2-5 минут)
4. Ваш сайт будет доступен по адресу: `https://your-app-name.onrender.com`

## Шаг 8: Проверка работы

1. Откройте ваш сайт
2. Попробуйте зарегистрироваться
3. Проверьте, что данные появляются в Firestore Database
4. Протестируйте все функции

## Возможные проблемы и решения

### Ошибка "Build failed"
- Проверьте, что все зависимости указаны в `package.json`
- Убедитесь, что Node.js версия совместима (>=18.0.0)

### Ошибка "Firebase service account file not found"
- Проверьте переменную `FIREBASE_SERVICE_ACCOUNT`
- Убедитесь, что JSON корректно скопирован

### Ошибка "Permission denied"
- Проверьте правила безопасности Firestore
- Убедитесь, что service account имеет права

### CORS ошибки
- Проверьте настройки CORS в `server.js`
- Убедитесь, что домен Render добавлен в разрешенные

## Обновление приложения

После внесения изменений в код:
1. Загрузите изменения в GitHub
2. Render автоматически пересоберет и перезапустит приложение
3. Дождитесь завершения деплоя

## Мониторинг

В Render Dashboard вы можете:
- Просматривать логи приложения
- Мониторить производительность
- Настраивать автоматические перезапуски
- Управлять переменными окружения 