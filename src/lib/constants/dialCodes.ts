export interface CountryDialCode {
  code: string;
  country: string;
  flag: string;
  iso: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "+225", country: "Côte d'Ivoire", flag: "🇨🇮", iso: "ci" },
  { code: "+221", country: "Sénégal", flag: "🇸🇳", iso: "sn" },
  { code: "+33", country: "France", flag: "🇫🇷", iso: "fr" },
  { code: "+237", country: "Cameroun", flag: "🇨🇲", iso: "cm" },
  { code: "+223", country: "Mali", flag: "🇲🇱", iso: "ml" },
  { code: "+224", country: "Guinée", flag: "🇬🇳", iso: "gn" },
  { code: "+229", country: "Bénin", flag: "🇧🇯", iso: "bj" },
  { code: "+228", country: "Togo", flag: "🇹🇬", iso: "tg" },
  { code: "+242", country: "Congo", flag: "🇨🇬", iso: "cg" },
  { code: "+243", country: "RDC", flag: "🇨🇩", iso: "cd" },
  { code: "+241", country: "Gabon", flag: "🇬🇦", iso: "ga" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫", iso: "bf" },
  { code: "+227", country: "Niger", flag: "🇳🇪", iso: "ne" },
  { code: "+212", country: "Maroc", flag: "🇲🇦", iso: "ma" },
  { code: "+213", country: "Algérie", flag: "🇩🇿", iso: "dz" },
  { code: "+216", country: "Tunisie", flag: "🇹🇳", iso: "tn" },
  { code: "+32", country: "Belgique", flag: "🇧🇪", iso: "be" },
  { code: "+41", country: "Suisse", flag: "🇨🇭", iso: "ch" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸", iso: "us" },
  { code: "+44", country: "Royaume-Uni", flag: "🇬🇧", iso: "gb" },
];
