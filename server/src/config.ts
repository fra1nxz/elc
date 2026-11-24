import "dotenv/config";

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Не задана переменная окружения ${key} (см. .env.example)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  serverUrl: process.env.SERVER_URL ?? "http://localhost:3001",
  dbPath: process.env.DB_PATH ?? "data/elc.db",
  priceMinor: Number(process.env.PRICE_MINOR ?? 99000),
  currency: process.env.CURRENCY ?? "RUB",
  webhookSecret: required("PAYMENT_WEBHOOK_SECRET"),
  adminToken: required("ADMIN_TOKEN"),
  provider: process.env.PAYMENT_PROVIDER ?? "mock",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "Elc <no-reply@elc.example>",
  },
  clientDist: process.env.CLIENT_DIST ?? "../client/dist",
};
