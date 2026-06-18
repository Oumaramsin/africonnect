"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Accueil" },
  { href: "/traiteur", icon: "🍽️", label: "Traiteur" },
  { href: "/gp", icon: "✈️", label: "GP Colis" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      setIsLoggedIn(true);
      setIsAdmin(data?.role === "admin");
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideOn = ["/login", "/register", "/reset-password"];
  if (hideOn.includes(pathname)) return null;

  let items = [...NAV_ITEMS];

  if (isLoggedIn) {
    items.push(
      { href: "/commandes", icon: "📦", label: "Commandes" },
      { href: "/profil", icon: "👤", label: "Profil" },
    );
    if (isAdmin) {
      items.push({ href: "/admin", icon: "🔐", label: "Admin" });
    }

  }else{
    items.push({ href: "/login", icon: "👤", label: "Se Connecter" },)
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
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
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
