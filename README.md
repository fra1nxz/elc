# Elc — сайт с покупкой доступа и активационным кодом

**Стек:** React + TypeScript + Vite + CSS (папка `client`), Node.js + Express + TypeScript + SQLite (папка `server`).
Нужен Node.js 18+.

## Быстрый старт (разработка)

```bash
npm run install:all
cp server/.env.example server/.env     # заполните PAYMENT_WEBHOOK_SECRET и ADMIN_TOKEN
npm run dev:server                     # терминал 1 → http://localhost:3001
npm run dev:client                     # терминал 2 → http://localhost:5173
```

По умолчанию `PAYMENT_PROVIDER=mock`: после ввода email открывается тестовая страница оплаты на сервере с кнопками «Оплатить» и «Отказ». Письма без SMTP печатаются в консоль сервера.

## Продакшен

```bash
npm run build      # собирает client/dist и server/dist
npm start          # сервер сам раздаёт сайт и API на одном порту
```
Задайте в `.env` реальные `CLIENT_URL`, `SERVER_URL`, `SMTP_*`, секреты и `PAYMENT_PROVIDER`. Держите сайт за HTTPS.

## Что реализовано по ТЗ

| Требование | Где |
|---|---|
| Главная, оплата, успех, ошибка, Navbar, Footer, снег | `client/src` |
| Проверка email | клиент (`Pay.tsx`) и сервер (zod) |
| Код выдаётся только после подтверждения оплаты сервером | `GET /api/purchase/:token`, вебхук |
| Подпись вебхука (HMAC-SHA256, заголовок `x-signature`) | `server/src/payment.ts` |
| Повторный вебхук не создаёт новый код | `settle()` в `service.ts` (транзакция) |
| Код 16 символов, A–Z и 2–9, `crypto.randomInt`, уникален | `codes.ts`, PRIMARY KEY |
| Письмо с кодом и инструкцией | `mail.ts` |
| Активация, привязка к устройству, повтор на том же | `POST /api/activate` |
| Сброс привязки только поддержкой + история | `POST /api/admin/reset`, таблица `resets` |
| БД: покупки, email, статусы, коды, привязки, сбросы | `db.ts` (SQLite) |

## API

- `POST /api/checkout` `{ email }` → `{ url }` (ссылка на оплату)
- `POST /api/webhook/payment` — вебхук провайдера, `{ orderId, status: "paid"|"failed" }`
- `GET /api/purchase/:token` → статус и код (после оплаты)
- `POST /api/activate` `{ code, deviceId }` → `200 {ok:true}` / `403 device_mismatch` / `404 unknown_code`
- `POST /api/admin/reset` `{ code, reason? }` + заголовок `x-admin-token` → сброс привязки

Пример сброса привязки поддержкой:
```bash
curl -X POST https://ВАШ_САЙТ/api/admin/reset -H "content-type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" -d '{"code":"КОД","reason":"потерял устройство"}'
```

## Что нужно доделать (в ТЗ определяется отдельно)

1. **Платёжный провайдер:** в `server/src/payment.ts` замените `mockProvider` адаптером выбранного провайдера (создание платежа, ссылка на оплату) и подстройте `verifySignature` и разбор тела вебхука под его формат. В вебхуке также стоит сверять сумму платежа.
2. **Тексты, цена, контакты:** `client/src/content.ts` и `PRICE_MINOR` в `.env`.
3. **Почта:** заполните `SMTP_*`.
4. **Приложение:** должно передавать на `/api/activate` код и стабильный `deviceId` устройства.
