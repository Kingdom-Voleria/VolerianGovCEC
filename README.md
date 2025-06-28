# VolGovCEC - Система электронного голосования

Система электронного голосования для граждан Волерского королевства.

## Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Настройте Firebase:
   - Создайте проект в Firebase Console
   - Скачайте service account key и сохраните как `firebase-service-account.json`
   - Обновите `firebase-config.js` с вашими настройками

3. Запустите сервер:
```bash
npm start
```

Сервер будет доступен по адресу: http://localhost:3000

## Деплой на Render

### Автоматический деплой через GitHub

1. Загрузите код в GitHub репозиторий
2. Зайдите на [render.com](https://render.com) и создайте аккаунт
3. Нажмите "New +" и выберите "Web Service"
4. Подключите ваш GitHub репозиторий
5. Настройте следующие параметры:
   - **Name**: volgovcec (или любое другое)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Переменные окружения

В настройках сервиса на Render добавьте следующие переменные окружения:

- `NODE_ENV`: `production`
- `PORT`: `10000` (или оставьте пустым для автоматического назначения)

### Firebase настройки

Убедитесь, что ваш Firebase проект настроен для работы с внешними доменами:

1. В Firebase Console перейдите в Authentication > Settings > Authorized domains
2. Добавьте ваш Render домен (например: `your-app-name.onrender.com`)

## Структура проекта

- `server.js` - основной серверный файл
- `firebase-config.js` - конфигурация Firebase
- `package.json` - зависимости и скрипты
- `render.yaml` - конфигурация для Render
- `*.html` - HTML страницы
- `style.css` - стили
- `main.js` - клиентский JavaScript

## API Endpoints

- `GET /api/me` - получить информацию о текущем пользователе
- `POST /api/register` - регистрация пользователя
- `POST /api/vote` - голосование
- `GET /api/votes` - получить результаты голосования
- `POST /api/moderate` - модерация пользователей
- И другие...

## Безопасность

- CSRF защита
- Rate limiting
- Helmet для безопасности заголовков
- Валидация входных данных
- Сессии через Firestore 