"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  LayoutGrid,
  Package,
  User,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { useNavSession } from "@/hooks/useNavSession";

const NAV_ITEMS = [
  { href: "/", icon: <Home size={22} />, label: "Accueil" },
  { href: "/services", icon: <LayoutGrid size={22} />, label: "Services" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Session et compteur de notifications partagés avec la Navbar (aucun appel réseau en double)
  const { isLoggedIn, user, unreadCount } = useNavSession(pathname);
  const isAdmin = user?.isAdmin ?? false;
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isReduced = window.visualViewport.height < window.innerHeight * 0.78;
        setIsKeyboardOpen(isReduced);
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  const hideOn = ["/login", "/register", "/reset-password", "/forgot-password"];
  if (hideOn.includes(pathname)) return null;

  const items = [...NAV_ITEMS];

  if (isLoggedIn) {
    items.push(
      { href: "/commandes", icon: <Package size={22} />, label: "Commandes" },
      { href: "/profil", icon: <User size={22} />, label: "Profil" },
    );
    if (isAdmin) {
      items.push({
        href: "/admin",
        icon: <ShieldCheck size={22} />,
        label: "Admin",
      });
    }
  } else {
    items.push(
      { href: "/login", icon: <LogIn size={22} />, label: "Connexion" },
    );
  }

  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around pt-1.5 pb-2 px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const isCommandes = item.href === "/commandes";

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                padding: "6px 12px",
                borderRadius: "12px",
                textDecoration: "none",
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    color: isActive ? "#1D6B45" : "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </span>

                {isCommandes && !pathname.startsWith("/commandes") && unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-8px",
                      backgroundColor: "#EF4444",
                      color: "white",
                      fontSize: "9px",
                      fontWeight: "bold",
                      borderRadius: "10px",
                      padding: "1px 5px",
                      minWidth: "16px",
                      height: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>

              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: isActive ? "#1D6B45" : "#9ca3af",
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#1D6B45",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
