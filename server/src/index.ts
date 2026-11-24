import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { db } from "./db.js";
import { isMock, provider, verifySignature } from "./payment.js";
import {
  activate, createPurchase, getCodeFor, getPurchase, getPurchaseByToken,
  handlePaymentEvent, resetBinding,
} from "./service.js";

const app = express();
app.disable("x-powered-by");

// --- Вебхук платёжного провайдера: нужно сырое тело для проверки подписи ---
const webhookSchema = z.object({ orderId: z.string().uuid(), status: z.enum(["paid", "failed"]) });
app.post("/api/webhook/payment", express.raw({ type: "*/*", limit: "100kb" }), async (req, res) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !verifySignature(raw, req.header("x-signature"))) {
    return res.status(401).json({ error: "bad_signature" });
  }
  const parsed = webhookSchema.safeParse(safeJson(raw.toString("utf8")));
  if (!parsed.success) return res.status(400).json({ error: "bad_body" });
  const found = await handlePaymentEvent(parsed.data.orderId, parsed.data.status);
  res.status(found ? 200 : 404).json({ ok: found });
});

app.use(express.json({ limit: "10kb" }));
const strict = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

// --- Сайт ---
app.get("/api/config", (_req, res) => {
  res.json({ price: config.priceMinor / 100, currency: config.currency });
});

app.post("/api/checkout", strict, async (req, res) => {
  const body = z.object({ email: z.string().trim().email().max(254) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_email" });
  const purchase = createPurchase(body.data.email.toLowerCase());
  try {
    const { paymentId, url } = await provider.createPayment({
      orderId: purchase.id,
      amount: config.priceMinor,
      currency: config.currency,
      email: purchase.email,
      successUrl: `${config.clientUrl}/success?t=${purchase.public_token}`,
      failUrl: `${config.clientUrl}/fail`,
    });
    db.prepare("UPDATE purchases SET provider_payment_id=? WHERE id=?").run(paymentId, purchase.id);
    res.json({ url });
  } catch (e) {
    console.error(e);
    db.prepare("UPDATE purchases SET status='failed' WHERE id=?").run(purchase.id);
    res.status(502).json({ error: "payment_unavailable" });
  }
});

// Код отдаётся только после подтверждения оплаты сервером; возврат на страницу сам по себе ничего не даёт
app.get("/api/purchase/:token", (req, res) => {
  const p = getPurchaseByToken(req.params.token);
  if (!p) return res.status(404).json({ error: "not_found" });
  if (p.status !== "paid") return res.json({ status: p.status });
  res.json({ status: "paid", email: p.email, code: getCodeFor(p.id) });
});

// --- API для приложения ---
app.post("/api/activate", strict, (req, res) => {
  const body = z
    .object({ code: z.string().trim().min(15).max(20), deviceId: z.string().min(8).max(128) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });
  const r = activate(body.data.code.toUpperCase(), body.data.deviceId);
  if (!r.ok) return res.status(r.status).json({ ok: false, error: r.error });
  res.json({ ok: true });
});

// --- Поддержка: ручной сброс привязки ---
app.post("/api/admin/reset", strict, (req, res) => {
  const given = Buffer.from(req.header("x-admin-token") ?? "");
  const want = Buffer.from(config.adminToken);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return res.status(401).json({ error: "unauthorized" });
  const body = z.object({ code: z.string().trim().min(15).max(20), reason: z.string().max(500).optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "bad_request" });
  const ok = resetBinding(body.data.code.toUpperCase(), body.data.reason);
  res.status(ok ? 200 : 404).json({ ok });
});

// --- Тестовая страница оплаты (только PAYMENT_PROVIDER=mock) ---
if (isMock) {
  app.get("/mock-pay/:id", (req, res) => {
    const p = getPurchase(req.params.id);
    if (!p) return res.sendStatus(404);
    res.type("html").send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font:16px system-ui;background:#0e1116;color:#e8edf4;max-width:420px;margin:15vh auto;padding:20px">
<h2>Тестовая оплата Elc</h2><p>Покупатель: ${escapeHtml(p.email)}</p>
<form method="post" action="/mock-pay/${p.id}/paid" style="margin:12px 0"><button style="padding:12px 20px">Оплатить успешно</button></form>
<form method="post" action="/mock-pay/${p.id}/failed"><button style="padding:12px 20px">Имитировать отказ</button></form></body>`);
  });
  app.post("/mock-pay/:id/:result", async (req, res) => {
    const p = getPurchase(req.params.id);
    const result = req.params.result;
    if (!p || (result !== "paid" && result !== "failed")) return res.sendStatus(404);
    await handlePaymentEvent(p.id, result);
    res.redirect(303, result === "paid" ? `${config.clientUrl}/success?t=${p.public_token}` : `${config.clientUrl}/fail`);
  });
}

// --- Раздача собранного фронтенда в продакшене ---
const dist = resolve(config.clientDist);
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.listen(config.port, () => console.log(`Elc server: http://localhost:${config.port}`));

function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return null; } }
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`); }
