import { randomBytes, randomUUID } from "node:crypto";
import { config } from "./config.js";
import { db } from "./db.js";
import { generateCode } from "./codes.js";
import { sendCodeEmail } from "./mail.js";

export interface Purchase {
  id: string; public_token: string; email: string; status: "pending" | "paid" | "failed";
  provider_payment_id: string | null; email_sent: number;
}

export const getPurchase = (id: string) =>
  db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as Purchase | undefined;
export const getPurchaseByToken = (t: string) =>
  db.prepare("SELECT * FROM purchases WHERE public_token = ?").get(t) as Purchase | undefined;
export const getCodeFor = (purchaseId: string) =>
  (db.prepare("SELECT code FROM codes WHERE purchase_id = ?").get(purchaseId) as { code: string } | undefined)?.code;

export function createPurchase(email: string): Purchase {
  const id = randomUUID();
  const token = randomBytes(16).toString("hex");
  db.prepare(
    "INSERT INTO purchases (id, public_token, email, amount, currency, status) VALUES (?,?,?,?,?, 'pending')"
  ).run(id, token, email, config.priceMinor, config.currency);
  return getPurchase(id)!;
}

type Settled =
  | { found: false }
  | { found: true; created: false }
  | { found: true; created: true; code: string; email: string };

const settle = db.transaction((orderId: string, status: "paid" | "failed"): Settled => {
  const p = getPurchase(orderId);
  if (!p) return { found: false };
  // Повторное уведомление: ничего не меняем и новый код не создаём
  if (p.status !== "pending") return { found: true, created: false };
  if (status === "failed") {
    db.prepare("UPDATE purchases SET status='failed' WHERE id=?").run(orderId);
    return { found: true, created: false };
  }
  db.prepare("UPDATE purchases SET status='paid', paid_at=datetime('now') WHERE id=?").run(orderId);
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    try {
      db.prepare("INSERT INTO codes (code, purchase_id) VALUES (?,?)").run(code, orderId);
      return { found: true, created: true, code, email: p.email };
    } catch (e) {
      if (!String(e).includes("UNIQUE")) throw e; // коллизия кода — пробуем снова
    }
  }
  throw new Error("Не удалось сгенерировать уникальный код");
});

/** Обработка подтверждённого результата оплаты. Идемпотентна. Возвращает false, если заказ не найден. */
export async function handlePaymentEvent(orderId: string, status: "paid" | "failed"): Promise<boolean> {
  const r = settle(orderId, status);
  if (r.found && r.created) {
    try {
      await sendCodeEmail(r.email, r.code);
      db.prepare("UPDATE purchases SET email_sent=1 WHERE id=?").run(orderId);
    } catch (e) {
      console.error("Не удалось отправить письмо, код доступен на сайте:", e);
    }
  }
  return r.found;
}

export const resetBinding = db.transaction((code: string, reason: string | undefined): boolean => {
  const row = db.prepare("SELECT device_id, device_public_key FROM codes WHERE code=?").get(code) as {
    device_id: string | null;
    device_public_key: string | null;
  } | undefined;
  if (!row) return false;
  db.prepare(`
    INSERT INTO resets (code, old_device_id, old_device_public_key, reason)
    VALUES (?, ?, ?, ?)
  `).run(code, row.device_id, row.device_public_key, reason ?? null);
  db.prepare(`
    UPDATE codes
    SET device_id=NULL, device_public_key=NULL, key_algorithm=NULL, activated_at=NULL
    WHERE code=?
  `).run(code);
  return true;
});
