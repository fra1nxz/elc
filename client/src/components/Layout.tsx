import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { contacts } from "../content";
import Snow from "./Snow";

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    setOpen(false);
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Snow />
      <header className="header">
        <div className="wrap nav">
          <Link className="logo" to="/">Elc</Link>
          <button className="burger" aria-label="Меню" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
          <nav className={"links" + (open ? " open" : "")}>
            <Link to="/#about">О приложении</Link>
            <Link to="/#features">Возможности</Link>
            <Link to="/#contacts">Контакты</Link>
            <Link className="btn small" to="/pay">Купить</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="wrap foot">
          <span><strong>Elc</strong> © {new Date().getFullYear()}</span>
          <div className="foot-links">
            <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
            <a href={contacts.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
            <a href={contacts.vk} target="_blank" rel="noopener noreferrer">VK</a>
            <Link to="/pay">Оплатить</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
