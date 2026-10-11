"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ExternalLink,
  Lock,
  AlertTriangle,
  Scale,
  Building2,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  X,
} from "lucide-react";
import { cguData, CGUArticle } from "@/data/cguData";

export default function CGUPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [expandedArticles, setExpandedArticles] = useState<Record<number, boolean>>({});

  const categories = useMemo(() => {
    const cats = Array.from(new Set(cguData.articles.map((a) => a.category)));
    return ["Tous", ...cats];
  }, []);

  const filteredArticles = useMemo(() => {
    return cguData.articles.filter((article) => {
      const matchesCategory =
        selectedCategory === "Tous" || article.category === selectedCategory;

      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchText =
        article.title.toLowerCase().includes(q) ||
        article.number.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.paragraphs.some((p) => p.toLowerCase().includes(q)) ||
        (article.bulletPoints &&
          article.bulletPoints.some((b) => b.toLowerCase().includes(q)));

      return matchesCategory && matchText;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: number) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 pb-20">
      {/* ── 1. TOP HERO BANNER ── */}
      <section className="bg-gradient-to-br from-[#0B3B24] via-[#165034] to-[#1D6B45] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/40 shadow-inner relative overflow-hidden">
        {/* Glow décoratif */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Retour à l&apos;accueil</span>
            </Link>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-300" />
                {cguData.version}
              </span>
              <span className="text-emerald-200/80 font-medium">
                Mise à jour : {cguData.lastUpdated}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-extrabold uppercase tracking-widest">
              <Scale size={14} />
              <span>Cadre Légal & Réglementaire Officiel</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Conditions Générales d&apos;Utilisation et de Service
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 max-w-3xl leading-relaxed">
              {cguData.subtitle}
            </p>
          </div>

          {/* Boutons d'actions rapides : Télécharger PDF & Imprimer */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="/CGU-DABARI.pdf"
              download="CGU-DABARI.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-black text-xs sm:text-sm hover:bg-emerald-50 transition-all shadow-md shadow-black/10"
            >
              <Download size={16} className="text-emerald-700" />
              <span>Télécharger le PDF officiel</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm border border-emerald-600/40 transition-colors backdrop-blur-xs"
            >
              <Printer size={16} />
              <span>Imprimer le document</span>
            </button>

            <a
              href="mailto:contact@ramsin.fr?subject=Question%20CGU%20Dabari"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/70 text-emerald-100 font-bold text-xs sm:text-sm border border-emerald-700/40 transition-colors ml-auto"
            >
              <Mail size={15} />
              <span>Contact Juridique</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. LES 3 PILIERS DE CONFIANCE DABARI ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/60 border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Cotransportage Conforme</h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Strict partage des frais réels sans but lucratif selon l&apos;article L. 3232-1 du code des transports.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/60 border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Séquestre Protecteur</h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Consignation sécurisée des acomptes et libération conditionnée à la livraison ou prestation.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-200/60 border border-slate-200/80 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Zéro Marchandise Interdite</h3>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Interdiction absolue des stupéfiants, armes et marchandises non déclarées sous contrôle douanier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BARRE DE RECHERCHE & FILTRES CATÉGORIES ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un mot-clé (séquestre, bagages, douane, litige, responsabilité)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent shadow-xs transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 text-right sm:text-left self-center">
            {filteredArticles.length} sur {cguData.articles.length} articles
          </div>
        </div>

        {/* Pilules de catégories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-[#1D6B45] text-white border-[#1D6B45] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4. CORPS DU DOCUMENT (ARTICLES 1 À 14) ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sommaire rapide desktop sticky */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Sommaire des Articles
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                14 Articles
              </span>
            </div>
            <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {cguData.articles.map((art) => (
                <a
                  key={art.id}
                  href={`#article-${art.id}`}
                  className="block px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors font-medium truncate"
                >
                  <span className="font-bold text-slate-900 mr-1.5">{art.number}</span>
                  <span>{art.title}</span>
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p className="flex items-center gap-1.5 text-slate-700 font-bold">
                <Building2 size={13} className="text-emerald-700" />
                {cguData.publisher.name}
              </p>
              <p className="text-slate-500">{cguData.publisher.contactEmail}</p>
            </div>
          </aside>

          {/* Liste détaillée des articles */}
          <div className="lg:col-span-8 space-y-6">
            {filteredArticles.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <FileText size={36} className="mx-auto text-slate-300" />
                <h3 className="font-black text-slate-900 text-base">Aucun article ne correspond</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Aucun article ne correspond à votre recherche &quot;{searchQuery}&quot;. Essayez un autre mot-clé ou réinitialisez les filtres.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Tous");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            ) : (
              filteredArticles.map((article) => {
                const isExpanded = expandedArticles[article.id] !== false; // ouvert par défaut

                return (
                  <article
                    key={article.id}
                    id={`article-${article.id}`}
                    className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-4 scroll-mt-28"
                  >
                    <header className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {article.number}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            • {article.category}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">
                          {article.title}
                        </h2>
                      </div>
                    </header>

                    {/* Résumé d'accroche */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      <span>{article.summary}</span>
                    </div>

                    {/* Paragraphes du texte officiel */}
                    <div className="space-y-3 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      {article.paragraphs.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}

                      {article.bulletPoints && article.bulletPoints.length > 0 && (
                        <ul className="space-y-2 mt-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                          {article.bulletPoints.map((bp, bpIdx) => (
                            <li key={bpIdx} className="flex items-start gap-2 text-slate-700">
                              <span className="text-emerald-700 font-black text-sm leading-none mt-0.5">•</span>
                              <span className="leading-snug">{bp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            {/* ── 5. NOTICE FINALE DE FERMETURE & MENTIONS LÉGALES ── */}
            <footer className="p-6 rounded-3xl bg-slate-100/80 border border-slate-200 space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Scale size={16} className="text-emerald-800" />
                <span>Valeur Probante & Cadre Réglementaire Français</span>
              </div>
              <p className="leading-relaxed">
                Les présentes Conditions Générales d’Utilisation et de Service régissent l’utilisation de la plateforme DABARI conformément au droit français applicable (Code des transports, Code civil, Code de la consommation et Code de commerce).
              </p>
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>Édité par {cguData.publisher.name}</span>
                <a
                  href="/CGU-DABARI.pdf"
                  download="CGU-DABARI.pdf"
                  className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <Download size={13} />
                  Télécharger le document PDF original
                </a>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
