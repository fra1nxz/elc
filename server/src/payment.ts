import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export interface CreatePaymentInput {
  orderId: string;
  amount: number; // в минимальных единицах
  currency: string;
  email: string;
  successUrl: string;
  failUrl: string;
}
export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<{ paymentId: string; url: string }>;
}

/** Тестовый провайдер: ведёт на страницу-имитацию на сервере. */
const mockProvider: PaymentProvider = {
  async createPayment({ orderId }) {
    return { paymentId: `mock_${orderId}`, url: `${config.serverUrl}/mock-pay/${orderId}` };
  },
};

/**
 * Здесь подключается реальный провайдер (ЮKassa, CloudPayments, Stripe и т.п.):
 * создать платёж через его API, вернуть ссылку на оплату и сохранить orderId
 * в метаданных платежа, чтобы вебхук мог найти покупку.
 */
export const provider: PaymentProvider = mockProvider;
export const isMock = config.provider === "mock";

export function sign(raw: Buffer | string): string {
  return createHmac("sha256", config.webhookSecret).update(raw).digest("hex");
}

/** Проверка подписи вебхука (HMAC-SHA256 от тела запроса). Подстройте под формат провайдера. */
export function verifySignature(raw: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const a = Buffer.from(sign(raw));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
