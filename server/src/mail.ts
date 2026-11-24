import nodemailer from "nodemailer";
import { config } from "./config.js";

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export async function sendCodeEmail(to: string, code: string): Promise<void> {
  const info = await transport.sendMail({
    from: config.smtp.from,
    to,
    subject: "Ваш активационный код Elc",
    text: [
      "Спасибо за покупку Elc!",
      "",
      `Ваш активационный код: ${code}`,
      "",
      "Как активировать:",
      "1. Откройте приложение Elc.",
      "2. Введите код в окне активации.",
      "3. Код привяжется к этому устройству и не будет работать на другом.",
      "",
      "Потеряли устройство или переустановили систему? Напишите в поддержку Elc — после проверки покупки привязку сбросят.",
    ].join("\n"),
  });
  if (!config.smtp.host) console.log("[mail:dev] SMTP не настроен, письмо не отправлено:", String((info as { message?: unknown }).message));
}
