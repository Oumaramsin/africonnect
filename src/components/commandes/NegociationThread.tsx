import { ArrowDownUp } from "lucide-react";
import type { NegociationEntry } from "@/lib/types/traiteur";
import { describeNegociationEntry } from "@/lib/negociation";

type Props = {
  entries: NegociationEntry[];
  /** Point de vue : les étapes de l'utilisateur sont alignées à droite */
  viewer: "client" | "traiteur";
  traiteurName?: string | null;
};

const formatStepDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${date.toLocaleTimeString(
    "fr-FR",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
};

/** Historique de la négociation du prix d'une offre (contre-propositions et réponses du traiteur). */
export default function NegociationThread({ entries, viewer, traiteurName }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl bg-violet-50/70 border border-violet-200 p-3 space-y-2">
      <p className="text-[11px] font-bold text-violet-800 flex items-center gap-1.5">
        <ArrowDownUp size={12} /> Négociation du prix
      </p>
      <ol className="space-y-1.5">
        {entries.map((entry, index) => {
          const mine = (entry.auteur === "client") === (viewer === "client");
          return (
            <li
              key={`${entry.at}-${index}`}
              className={`max-w-[92%] rounded-lg px-3 py-2 ${
                mine ? "ml-auto bg-violet-100" : "mr-auto bg-white border border-violet-200"
              }`}
            >
              <p className="text-xs font-bold text-slate-900">{describeNegociationEntry(entry, viewer, traiteurName)}</p>
              {entry.message && (
                <p className="text-xs text-slate-700 italic whitespace-pre-line leading-relaxed mt-0.5">
                  « {entry.message} »
                </p>
              )}
              <p className="text-[10px] text-slate-500 mt-0.5">{formatStepDate(entry.at)}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
