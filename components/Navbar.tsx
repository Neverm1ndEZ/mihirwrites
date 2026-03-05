"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        backdropFilter: "blur(12px)",
        backgroundColor: scrolled ? "color-mix(in srgb, var(--bg) 85%, transparent)" : "transparent",
        transition: "all 0.3s ease",
      }}
    >
      <nav
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-lora), serif",
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--fg)",
            letterSpacing: "-0.03em",
            textDecoration: "none",
          }}
        >
          Home
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

          {[{ href: '/threads', label: 'Threads' }, { href: '/constellation', label: '✦ Map' }, { href: '/year/' + new Date().getFullYear(), label: 'Year' }].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: '0.8125rem', color: 'var(--fg-muted)', textDecoration: 'none', padding: '0.375rem 0.75rem', borderRadius: '6px', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-secondary)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg-muted)'; }}>
              {label}
            </Link>
          ))}
          <Link
            href="/admin"
            style={{
              fontSize: "0.8125rem",
              color: "var(--fg-muted)",
              textDecoration: "none",
              padding: "0.375rem 0.75rem",
              borderRadius: "6px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.backgroundColor = "var(--bg-secondary)";
              (e.target as HTMLAnchorElement).style.color = "var(--fg)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.backgroundColor = "transparent";
              (e.target as HTMLAnchorElement).style.color = "var(--fg-muted)";
            }}
          >
            Admin
          </Link>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-muted)",
              transition: "all 0.15s",
              fontSize: "1rem",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            {theme === "dark" ? "☀" : "◑"}
          </button>
        </div>
      </nav>
    </header>
  );
}
