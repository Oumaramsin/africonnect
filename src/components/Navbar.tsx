"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Package,
  UtensilsCrossed,
  Plane,
  Grid,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { getValidToken, decodeToken, removeToken } from "@/lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuthAndNotifications = async () => {
      const token = getValidToken();
      if (!token) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUserEmail(null);
        setUserRole(null);
        setUnreadCount(0);
        return;
      }

      const decoded = decodeToken(token);
      if (!decoded) {
        removeToken();
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUserEmail(null);
        setUserRole(null);
        setUnreadCount(0);
        return;
      }

      setIsLoggedIn(true);
      setIsAdmin(decoded.role === "admin");
      setUserEmail(decoded.email || null);
      setUserRole(decoded.role || "client");

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        if (res.status === 401) {
          removeToken();
          setIsLoggedIn(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (pathname.startsWith("/commandes")) {
            setUnreadCount(0);
          } else {
            setUnreadCount(data.unread_count || 0);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des notifications:", err);
      }
    };

    checkAuthAndNotifications();

    const handleNotifUpdate = () => {
      if (pathname.startsWith("/commandes")) {
        setUnreadCount(0);
      } else {
        checkAuthAndNotifications();
      }
    };

    window.addEventListener("notifications-updated", handleNotifUpdate);
    return () => {
      window.removeEventListener("notifications-updated", handleNotifUpdate);
    };
  }, [pathname]);

  // Fermeture du menu profil lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer le menu mobile lors d'un changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Accueil", icon: Sparkles },
    { href: "/traiteur", label: "Traiteur", icon: UtensilsCrossed },
    { href: "/gp", label: "Transport GP", icon: Plane },
    { href: "/services", label: "Services", icon: Grid },
    ...(isLoggedIn
      ? [
          {
            href: "/commandes",
            label: "Mes Commandes",
            icon: Package,
            badge: pathname.startsWith("/commandes") ? 0 : unreadCount,
          },
        ]
      : []),
  ];

  const hideNavbarOn = ["/login", "/register", "/reset-password", "/forgot-password"];
  if (hideNavbarOn.includes(pathname)) return null;

  const isHomeDashboard = pathname === "/dashboard" || pathname === "/";

  const getMobileTitle = () => {
    if (pathname.startsWith("/cgu")) return "Conditions d'Utilisation";
    if (pathname.startsWith("/traiteur/demande")) return "Demande de Devis";
    if (pathname.startsWith("/traiteur/commander")) return "Finaliser Commande";
    if (pathname.startsWith("/traiteur")) return "Traiteurs & Menus";
    if (pathname.startsWith("/gp/nouvelle")) return "Nouveau Trajet GP";
    if (pathname.startsWith("/gp")) return "Transport GP Colis";
    if (pathname.startsWith("/commandes")) return "Mes Commandes";
    if (pathname.startsWith("/profil/traiteur")) return "Espace Traiteur";
    if (pathname.startsWith("/profil/gp")) return "Espace GP Pro";
    if (pathname.startsWith("/profil")) return "Mon Compte";
    if (pathname.startsWith("/admin")) return "Administration";
    if (pathname.startsWith("/services")) return "Services Dabari";
    return "Dabari";
  };

  return (
    <>
      {!isHomeDashboard && (
        <div className="md:hidden sticky top-0 z-40 bg-[#165034] text-white px-4 py-3 flex items-center justify-between shadow-md">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
            aria-label="Retour"
          >
            <span className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronDown className="rotate-90" size={18} />
            </span>
            <span className="text-xs font-semibold text-white/80">Retour</span>
          </button>

          <span className="font-extrabold text-sm tracking-tight text-white truncate max-w-[190px]">
            {getMobileTitle()}
          </span>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/profil"
                className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white"
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : <User size={14} />}
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-2.5 py-1 rounded-lg bg-[#D4870A] text-white text-xs font-bold"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}

      <header className="hidden md:block sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/70 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 md:h-20 gap-2 xl:gap-6 w-full">
          {/* ── 1. LOGO & BRAND (GAUCHE) ── */}
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-[#1D6B45] to-[#0F4A30] flex items-center justify-center text-white shadow-md shadow-[#1D6B45]/20 group-hover:scale-105 transition-transform duration-200">
              <span className="font-extrabold text-lg md:text-xl tracking-tight text-[#FAF7F2]">D</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg md:text-xl xl:text-2xl tracking-tight text-slate-900 group-hover:text-[#1D6B45] transition-colors">
                  Dabari
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[#1D6B45]/10 text-[#1D6B45]">
                  Diaspora
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 hidden xl:block -mt-1 whitespace-nowrap">
                Traiteurs & Transport GP
              </span>
            </div>
          </Link>

          {/* ── 2. DESKTOP NAV LINKS (CENTRÉS SANS RETOUR À LA LIGNE) ── */}
          <nav className="hidden md:flex items-center justify-center gap-0.5 lg:gap-1 xl:gap-1.5">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 ${
                    isActive
                      ? "text-[#1D6B45] bg-[#E8F5E9]/80 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? "text-[#1D6B45]" : "text-slate-400 group-hover:text-slate-600"}
                  />
                  <span className="whitespace-nowrap">{link.label}</span>

                  {/* Badge notifications sur commandes */}
                  {Boolean(link.badge && link.badge > 0) && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-xs animate-pulse">
                      {link.badge! > 9 ? "9+" : link.badge}
                    </span>
                  )}

                  {/* Petit point indicateur actif */}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1D6B45]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── 3. ACTIONS & USER AREA (DROITE) ── */}
          <div className="flex items-center gap-1.5 xl:gap-3 shrink-0">
            {/* Boutons d'action rapide PC (affichés uniquement à partir de xl pour ne jamais pousser la navbar) */}
            <div className="hidden xl:flex items-center gap-2 shrink-0">
              <Link
                href="/traiteur/demande"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl whitespace-nowrap transition-all"
              >
                <PlusCircle size={14} className="text-[#1D6B45]" />
                <span className="whitespace-nowrap">Demander un devis</span>
              </Link>
              <Link
                href="/gp/nouvelle"
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#1D6B45] to-[#155234] hover:brightness-110 px-3 py-2 rounded-xl shadow-xs whitespace-nowrap transition-all"
              >
                <Plane size={14} />
                <span className="whitespace-nowrap">Publier un vol</span>
              </Link>
            </div>

            {/* Notification Bell (si connecté) */}
            {isLoggedIn && (
              <Link
                href="/commandes"
                title="Mes notifications"
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              >
                <Bell size={18} />
                {!pathname.startsWith("/commandes") && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </Link>
            )}

            {/* User Profile / Auth Button (Juste le logo de profil épuré) */}
            {isLoggedIn ? (
              <div className="relative shrink-0" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  title="Mon profil et compte"
                  className="flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/90 hover:border-[#1D6B45]/40 hover:bg-slate-50 transition-all focus:outline-hidden shrink-0 cursor-pointer shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1D6B45] to-[#D4870A] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 mr-1 transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Desktop */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-500">Connecté en tant que</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{userEmail}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#1D6B45]/10 text-[#1D6B45] capitalize">
                        {isAdmin ? "Administrateur" : `Rôle: ${userRole || "client"}`}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profil"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <User size={16} className="text-slate-400" />
                        Mon Profil
                      </Link>
                      <Link
                        href="/commandes"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Package size={16} className="text-slate-400" />
                          Mes Commandes & Devis
                        </div>
                        {!pathname.startsWith("/commandes") && unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/profil/gp"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <Plane size={16} className="text-slate-400" />
                        Espace Transporteur GP
                      </Link>
                      <Link
                        href="/profil/traiteur"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <UtensilsCrossed size={16} className="text-slate-400" />
                        Espace Traiteur
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <ShieldCheck size={16} className="text-amber-600" />
                          Panneau Administrateur
                        </Link>
                      )}

                      <Link
                        href="/cgu"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <ShieldCheck size={16} className="text-slate-400" />
                        Conditions d&apos;Utilisation (CGU)
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut size={16} />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#1D6B45] hover:bg-[#155234] shadow-sm shadow-[#1D6B45]/20 transition-all hover:scale-102"
                >
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Hamburger button pour menu mobile étendu */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE MENU DRAWER ── */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-3 duration-200">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive ? "bg-[#E8F5E9] text-[#1D6B45]" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-[#1D6B45]" : "text-slate-400"} />
                    <span>{link.label}</span>
                  </div>
                  {Boolean(link.badge && link.badge > 0) && (
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/traiteur/demande"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
            >
              <PlusCircle size={15} className="text-[#1D6B45]" />
              Demander un devis traiteur
            </Link>
            <Link
              href="/gp/nouvelle"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold text-white bg-[#1D6B45] rounded-xl shadow-xs"
            >
              <Plane size={15} />
              Publier un trajet GP
            </Link>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
