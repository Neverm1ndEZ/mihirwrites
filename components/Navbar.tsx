"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const links = [
    { href: "/threads", label: "Threads" },
    { href: "/constellation", label: "✦ Map" },
    { href: `/year/${new Date().getFullYear()}`, label: "Year" },
    { href: "/admin", label: "Admin" },
  ];

  const navLinkStyle = (href: string): React.CSSProperties => ({
    fontSize: "0.8125rem",
    color: pathname === href ? "var(--fg)" : "var(--fg-muted)",
    textDecoration: "none",
    padding: "0.375rem 0.625rem",
    borderRadius: "6px",
    transition: "all 0.15s",
    fontWeight: pathname === href ? 500 : 400,
    background: pathname === href ? "var(--bg-secondary)" : "transparent",
  });

  const themeBtn: React.CSSProperties = {
    width: "34px",
    height: "34px",
    borderRadius: "7px",
    border: "1px solid var(--border)",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--fg-muted)",
    transition: "all 0.15s",
    fontSize: "0.9375rem",
    flexShrink: 0,
  };

  return (
    <>
      <style>{`
        .nav-desktop { display: flex; align-items: center; gap: 0.25rem; }
        .nav-mobile-right { display: none; align-items: center; gap: 0.375rem; }
        .nav-mobile-menu { display: none; }
        @media (max-width: 560px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-right { display: flex !important; }
          .nav-mobile-menu { display: block !important; }
        }
        .nav-link:hover {
          background-color: var(--bg-secondary) !important;
          color: var(--fg) !important;
        }
      `}</style>

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
            padding: "0 1.25rem",
            height: "56px",
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
              fontSize: "1.1875rem",
              fontWeight: 600,
              color: "var(--fg)",
              letterSpacing: "-0.03em",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Home
          </Link>

          {/* Desktop links */}
          <div className="nav-desktop">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="nav-link" style={navLinkStyle(href)}>
                {label}
              </Link>
            ))}
            <button onClick={toggleTheme} aria-label="Toggle theme" style={{ ...themeBtn, marginLeft: "0.25rem" }}>
              {theme === "dark" ? "☀" : "◑"}
            </button>
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="nav-mobile-right">
            <button onClick={toggleTheme} aria-label="Toggle theme" style={themeBtn}>
              {theme === "dark" ? "☀" : "◑"}
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "7px",
                border: "1px solid var(--border)",
                background: menuOpen ? "var(--bg-secondary)" : "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span style={{ width: "14px", height: "1.5px", background: "var(--fg-muted)", borderRadius: "1px", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translateY(5.5px)" : "none", display: "block" }} />
              <span style={{ width: "14px", height: "1.5px", background: "var(--fg-muted)", borderRadius: "1px", transition: "all 0.2s", opacity: menuOpen ? 0 : 1, display: "block" }} />
              <span style={{ width: "14px", height: "1.5px", background: "var(--fg-muted)", borderRadius: "1px", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translateY(-5.5px)" : "none", display: "block" }} />
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            className="nav-mobile-menu"
            style={{
              borderTop: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--bg) 96%, transparent)",
              backdropFilter: "blur(12px)",
            }}
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: "block",
                  padding: "0.875rem 1.25rem",
                  fontSize: "0.9375rem",
                  color: pathname === href ? "var(--accent)" : "var(--fg-muted)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: pathname === href ? 500 : 400,
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
