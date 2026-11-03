import type { ComponentProps } from "react";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminDabariClient from "./AdminDabariClient";
import { fetchApiAsUser, getSessionToken } from "@/lib/serverSession";

type AdminPageData =
  | { status: "ok"; props: ComponentProps<typeof AdminDabariClient> }
  | { status: "login" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

const UNAVAILABLE_MESSAGE =
  "Le serveur Dabari ne répond pas pour le moment. Réessayez dans quelques instants.";

/**
 * Lecture de l'utilisateur et des données d'administration. Les erreurs (API injoignable, délai
 * dépassé, réponse illisible) sont interceptées ici pour afficher une page lisible ; les
 * redirections sont faites par la page, hors du try/catch (redirect() lève une exception).
 */
async function loadAdminData(token: string): Promise<AdminPageData> {
  try {
    // Utilisateur et rôle vérifiés par l'API (signature du jeton, compte et rôle relus en base)
    const meResponse = await fetchApiAsUser("/auth/me", token);
    if (meResponse.status === 401) return { status: "login" };
    if (meResponse.status >= 500) return { status: "error", message: UNAVAILABLE_MESSAGE };
    if (!meResponse.ok) return { status: "forbidden" };
    const { user } = await meResponse.json();
    if (user?.is_admin !== true) return { status: "forbidden" };

    const response = await fetchApiAsUser("/admin", token, {
      headers: { "Content-Type": "application/json" },
    });
    if (response.status === 401) return { status: "login" };
    if (response.status >= 500) return { status: "error", message: UNAVAILABLE_MESSAGE };
    if (!response.ok) return { status: "forbidden" };
    const data = await response.json();

    return {
      status: "ok",
      props: {
        currentUserId: user.id,
        traiteurs: data?.data?.traiteurs ?? [],
        gpListings: data?.data?.gpListings ?? [],
        profiles: data?.data?.profiles ?? [],
      },
    };
  } catch (error) {
    // Erreurs internes de Next.js (rendu dynamique, redirection) : à laisser passer
    unstable_rethrow(error);
    console.error("[admin] Chargement impossible :", error);
    return { status: "error", message: UNAVAILABLE_MESSAGE };
  }
}

export default async function AdminPage() {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const result = await loadAdminData(token);
  if (result.status === "login") {
    redirect("/login");
  }
  if (result.status === "forbidden") {
    redirect("/");
  }
  if (result.status === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <h1 className="text-xl font-black text-slate-900">Administration indisponible</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{result.message}</p>
          <Link
            href="/admin"
            prefetch={false}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1D6B45] hover:bg-[#155234] text-white text-sm font-bold transition-colors"
          >
            Réessayer
          </Link>
        </div>
      </div>
    );
  }

  return <AdminDabariClient {...result.props} />;
}
