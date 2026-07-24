"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  ChefHat,
  Plane,
  Package,
  User,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import cookies from "js-cookie";

const NAV_ITEMS = [
  { href: "/dashboard", icon: <Home size={22} />, label: "Accueil" },
  { href: "/traiteur", icon: <ChefHat size={22} />, label: "Traiteur" },
  { href: "/gp", icon: <Plane size={22} />, label: "GP Colis" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const load = async () => {
      const token = cookies.get("token");
      if (!token) {
        return;
      }
      try {
        const payloadBase64 = token.split(".")[1];
        const decodedPayload = JSON.parse(
          Buffer.from(payloadBase64, "base64").toString("utf-8"),
        );
        setIsLoggedIn(true);
        setIsAdmin(decodedPayload.role === "admin")
      } catch (error) {
        console.error("Erreur dans le fetch du dashboard :", error);
      }
    };
    load();
  }, []);

  const hideOn = ["/login", "/register", "/reset-password"];
  if (hideOn.includes(pathname)) return null;

  let items = [...NAV_ITEMS];

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
    items.push({
      href: "/login",
      icon: <LogIn size={22} />,
      label: "Se Connecter",
    });
  }

  return (
    <nav
      style={{
        width: "100%",
        maxWidth: "430px",
        background: "white",
        borderTop: "1px solid #e5e7eb",
        flexShrink: 0,
        position: "fixed",
        bottom: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 0 12px",
        }}
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

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
              }}
            >
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
