# ELC — контракт API лицензирования для macOS-приложения

Все запросы выполняются по HTTPS к backend ELC. Тело запросов и ответов — JSON.

## Криптографическая схема

- Алгоритм: ECDSA P-256 / SHA-256.
- Private key создаётся на Mac и хранится в macOS Keychain. Он никогда не отправляется серверу.
- Public key передаётся как Base64 от DER/SPKI.
- Подпись передаётся как Base64 от DER-представления ECDSA-подписи.
- Каждый challenge действует 5 минут и может быть использован только один раз.
- Клиент подписывает **точные UTF-8 байты** строки `message`, которую вернул сервер. Не пересобирать её самостоятельно.

Пример CryptoKit:

```swift
import CryptoKit

let privateKey = P256.Signing.PrivateKey()
let publicKeyBase64 = privateKey.publicKey.derRepresentation.base64EncodedString()

// Сохранить privateKey.rawRepresentation в Keychain согласно реализации приложения.
// Для последующих запусков загрузить тот же ключ из Keychain.

let challengeMessage = Data(challenge.message.utf8)
let signature = try privateKey.signature(for: challengeMessage)
let signatureBase64 = signature.derRepresentation.base64EncodedString()
```

## 1. Получить challenge

`POST /api/activation/challenge`

```json
{
  "publicKey": "BASE64_DER_SPKI_PUBLIC_KEY"
}
```

Успех `200`:

```json
{
  "ok": true,
  "challengeId": "UUID",
  "nonce": "BASE64_NONCE",
  "message": "ELC-ACTIVATE\\nUUID\\nBASE64_NONCE\\nBASE64_DER_SPKI_PUBLIC_KEY"
}
```

Подписать `message` с помощью приватного ключа, соответствующего отправленному public key.

## 2. Первичная активация / повторная активация

`POST /api/activate`

```json
{
  "code": "16_CHARACTER_LICENSE_CODE",
  "publicKey": "BASE64_DER_SPKI_PUBLIC_KEY",
  "challengeId": "UUID_FROM_CHALLENGE",
  "signature": "BASE64_DER_ECDSA_SIGNATURE"
}
```

Успех `200`:

```json
{
  "ok": true,
  "firstActivation": true
}
```

`firstActivation` будет `false`, если этот же public key уже привязан к коду. Другой ключ получит `403 device_mismatch`.

## 3. Проверка лицензии при запуске

Сначала получить новый challenge по пункту 1, подписать `message`, затем вызвать:

`POST /api/activation/check`

Тело такое же, как у `/api/activate`:

```json
{
  "code": "16_CHARACTER_LICENSE_CODE",
  "publicKey": "BASE64_DER_SPKI_PUBLIC_KEY",
  "challengeId": "UUID_FROM_CHALLENGE",
  "signature": "BASE64_DER_ECDSA_SIGNATURE"
}
```

Успех `200`: `{ "ok": true }`. Проверка не создаёт и не меняет привязку.

## Ошибки

| HTTP | `error` | Значение |
|---|---|---|
| 400 | `invalid_request` | Некорректное тело запроса |
| 400 | `invalid_public_key` | Ключ не является корректным ECDSA P-256 SPKI |
| 403 | `invalid_signature` | Challenge отсутствует, истёк, уже использован или подпись неверна |
| 403 | `device_mismatch` | Код привязан к другому ключу либо имеет старую привязку |
| 404 | `unknown_code` | Код не найден |

## Сброс привязки поддержкой

`POST /api/admin/reset` остаётся внутренним административным endpoint. Он требует `x-admin-token`; токен нельзя помещать в приложение, сайт, репозиторий или передавать покупателю. При сбросе backend сохраняет запись в истории `resets` и очищает старую привязку, после чего покупатель может активировать код на новом Mac.

## Совместимость со старыми активациями

Коды, ранее активированные через старый `deviceId`, не переносятся автоматически на новый криптографический механизм. Для такого кода поддержка должна выполнить ручной сброс. Не запускать reset автоматически из приложения.

## Ограничения текущей поставки

- Backend поддерживает `PAYMENT_PROVIDER=mock`, если это задано в окружении. Это тестовая оплата, не реальное списание денег.
- Настройка SMTP не входит в этот контракт; выдача кода на странице успешной покупки остаётся прежней.
- Для реального релиза сначала сделать резервную копию SQLite и проверить миграцию на копии базы.
