import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api";

interface PurchaseView { status: "pending" | "paid" | "failed"; code?: string; email?: string }

export default function Success() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const navigate = useNavigate();
  const [data, setData] = useState<PurchaseView | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    if (!token) return;
    let stop = false, tries = 0, timer = 0;
    const tick = async () => {
      try {
        const r = await fetch(apiUrl(`/api/purchase/${encodeURIComponent(token)}`))
        if (stop) return;
        if (r.status === 404) return navigate("/fail", { replace: true });
        const d = (await r.json()) as PurchaseView;
        if (d.status === "failed") return navigate("/fail", { replace: true });
        setData(d);
        if (d.status === "pending") {
          if (++tries >= 30) return setTimedOut(true);
          timer = window.setTimeout(tick, 2000);
        }
      } catch {
        if (!stop) timer = window.setTimeout(tick, 3000);
      }
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [token, navigate]);

  if (!token) return <Navigate to="/" replace />;

  async function copy() {
    if (!data?.code) return;
    try { await navigator.clipboard.writeText(data.code); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* код можно выделить вручную */ }
  }

  if (data?.status !== "paid") {
    return (
      <div className="wrap"><div className="page">
        <h2>{timedOut ? "Оплата ещё не подтверждена" : "Ждём подтверждения оплаты…"}</h2>
        <p className="muted">
          {timedOut
            ? "Если деньги списаны, код придёт на почту в течение нескольких минут. Если письма нет — напишите в поддержку."
            : "Обычно это занимает несколько секунд. Не закрывайте страницу."}
        </p>
      </div></div>
    );
  }

  return (
    <div className="wrap"><div className="page">
      <h2>Оплата прошла</h2>
      <p className="muted">Ваш активационный код:</p>
      <div className="code">{data.code}</div>
      <button className="btn" onClick={copy}>{copied ? "Скопировано" : "Скопировать код"}</button>
      <p className="note">Письмо с тем же кодом отправлено на {data.email}.</p>
      <h3 className="sub">Как активировать</h3>
      <ol className="steps">
        <li>Откройте приложение Elc.</li>
        <li>Введите код в окне активации.</li>
        <li>Код привяжется к этому устройству и не будет работать на другом.</li>
      </ol>
      <p className="note">Потеряли устройство? Напишите в поддержку — после проверки покупки привязку сбросят.</p>
    </div></div>
  );
}
