# Настройка Firebase для Render

## 1. Подготовка Firebase проекта

### Создание проекта
1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Создайте новый проект или используйте существующий
3. Включите Firestore Database в режиме production

### Получение Service Account Key
1. В Firebase Console перейдите в Project Settings (шестеренка)
2. Перейдите на вкладку "Service accounts"
3. Нажмите "Generate new private key"
4. Скачайте JSON файл

## 2. Настройка для локальной разработки

### Вариант 1: Использование файла (рекомендуется для разработки)
1. Сохраните скачанный JSON файл как `firebase-service-account.json` в корне проекта
2. Убедитесь, что файл добавлен в `.gitignore` (уже добавлен)

### Вариант 2: Использование переменной окружения
1. Откройте скачанный JSON файл
2. Скопируйте всё содержимое
3. Создайте файл `.env` в корне проекта:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

## 3. Настройка для Render

### Добавление переменной окружения
1. В настройках вашего Render сервиса перейдите в "Environment"
2. Добавьте новую переменную:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Вставьте всё содержимое JSON файла (в одну строку)

### Пример значения переменной:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"}
```

## 4. Настройка правил безопасности Firestore

В Firebase Console перейдите в Firestore Database > Rules и установите следующие правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Разрешаем доступ к коллекции sessions для сессий
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
    
    // Разрешаем доступ к коллекции users
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Разрешаем доступ к коллекции votes
    match /votes/{voteId} {
      allow read, write: if true;
    }
  }
}
```

**Внимание**: Эти правила разрешают полный доступ. Для продакшена рекомендуется настроить более строгие правила безопасности.

## 5. Проверка настройки

После деплоя на Render:
1. Откройте ваш сайт
2. Попробуйте зарегистрироваться
3. Проверьте, что данные появляются в Firestore Database

## 6. Устранение проблем

### Ошибка "Firebase service account file not found"
- Убедитесь, что переменная `FIREBASE_SERVICE_ACCOUNT` установлена в Render
- Проверьте, что JSON корректно скопирован (включая все кавычки)

### Ошибка "Permission denied"
- Проверьте правила безопасности Firestore
- Убедитесь, что service account имеет необходимые права

### Ошибка "Invalid private key"
- Проверьте, что private key корректно скопирован
- Убедитесь, что нет лишних символов или переносов строк 