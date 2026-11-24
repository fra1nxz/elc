
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api";
import { contacts } from "../content";

interface PurchaseView {
  status: "pending" | "paid" | "failed";
  code?: string;
  email?: string;
}

export default function Success() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const navigate = useNavigate();

  const [data, setData] = useState<PurchaseView | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;

    let stop = false;
    let tries = 0;
    let timer = 0;

    const tick = async () => {
      try {
        const response = await fetch(
          apiUrl(`/api/purchase/${encodeURIComponent(token)}`)
        );

        if (stop) return;

        if (response.status === 404) {
          return navigate("/fail", { replace: true });
        }

        const result = (await response.json()) as PurchaseView;

        if (result.status === "failed") {
          return navigate("/fail", { replace: true });
        }

        setData(result);

        if (result.status === "pending") {
          if (++tries >= 30) {
            return setTimedOut(true);
          }

          timer = window.setTimeout(tick, 2000);
        }
      } catch {
        if (!stop) {
          timer = window.setTimeout(tick, 3000);
        }
      }
    };

    tick();

    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [token, navigate]);

  if (!token) return <Navigate to="/" replace />;

  async function copy() {
    if (!data?.code) return;

    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Код можно выделить и скопировать вручную.
    }
  }

  if (data?.status !== "paid") {
    return (
      <div className="wrap">
        <div className="page">
          <h2>
            {timedOut
              ? "Оплата ещё не подтверждена"
              : "Ждём подтверждения оплаты…"}
          </h2>

          <p className="muted">
            {timedOut
              ? "Если деньги списаны, но статус заказа не изменился, обратитесь в поддержку."
              : "Обычно подтверждение занимает несколько секунд. Не закрывайте страницу."}
          </p>

          <a
            href={contacts.telegram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Связаться с поддержкой
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="page">
        <h2>Оплата прошла</h2>

        <p className="muted">Ваш активационный код:</p>

        <div className="code">{data.code}</div>

        <button className="btn" onClick={copy}>
          {copied ? "Скопировано" : "Скопировать код"}
        </button>

        <p className="note">
          Сохраните код. Email заказа: {data.email || "не указан"}.
          Код также можно скопировать с этой страницы.
        </p>

        <h3 className="sub">Как активировать</h3>

        <ol className="steps">
          <li>Откройте приложение Elc.</li>
          <li>Введите код в окне активации.</li>
          <li>Код привяжется к этому устройству и не будет работать на другом.</li>
        </ol>

        <p className="note">
          Потеряли устройство? Напишите в поддержку.
          После проверки покупки привязку можно сбросить вручную.
        </p>

        <a
          href={contacts.telegram}
          target="_blank"
          rel="noopener noreferrer"
        >
          Поддержка Telegram
        </a>

        <p>
          <Link to="/agreement">Пользовательское соглашение</Link>
        </p>
      </div>
    </div>
  );
}
