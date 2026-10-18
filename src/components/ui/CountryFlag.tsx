import React from "react";
import { Globe } from "lucide-react";

interface CountryFlagProps {
  country?: string | null;
  className?: string;
  size?: number; // width in px, height will be 3/4 or proportional
}

/**
 * Pure SVG Country Flag component without any emojis.
 * Respects Dabari design guidelines, crisp vector rendering across all displays.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  className = "",
  size = 18,
}) => {
  if (!country) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <Globe style={{ width: size, height: size }} className="text-[#1D6B45]" />
      </span>
    );
  }

  const normalized = country.trim().toLowerCase();
  const height = Math.round((size * 3) / 4);

  // Common wrapper styling
  const svgWrapperClass = `inline-flex items-center justify-center align-middle rounded-[3px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-neutral-200/80 flex-shrink-0 ${className}`;

  switch (true) {
    // SÉNÉGAL
    case normalized.includes("sénégal") || normalized.includes("senegal"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#00853F" />
            <rect x="12" width="12" height="27" fill="#FDEF42" />
            <rect x="24" width="12" height="27" fill="#E31B23" />
            <polygon
              points="18,10 19.5,14.5 24,14.5 20.3,17.2 21.7,21.5 18,18.8 14.3,21.5 15.7,17.2 12,14.5 16.5,14.5"
              fill="#00853F"
            />
          </svg>
        </span>
      );

    // CÔTE D'IVOIRE
    case normalized.includes("ivoire") || normalized.includes("ivory"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#FF8200" />
            <rect x="12" width="12" height="27" fill="#FFFFFF" />
            <rect x="24" width="12" height="27" fill="#009A44" />
          </svg>
        </span>
      );

    // FRANCE
    case normalized.includes("france"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#002654" />
            <rect x="12" width="12" height="27" fill="#FFFFFF" />
            <rect x="24" width="12" height="27" fill="#CE1126" />
          </svg>
        </span>
      );

    // CAMEROUN
    case normalized.includes("cameroun") || normalized.includes("cameroon"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#007A5E" />
            <rect x="12" width="12" height="27" fill="#CE1126" />
            <rect x="24" width="12" height="27" fill="#FCD116" />
            <polygon
              points="18,10 19.5,14.5 24,14.5 20.3,17.2 21.7,21.5 18,18.8 14.3,21.5 15.7,17.2 12,14.5 16.5,14.5"
              fill="#FCD116"
            />
          </svg>
        </span>
      );

    // MALI
    case normalized.includes("mali"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#14B53A" />
            <rect x="12" width="12" height="27" fill="#FCD116" />
            <rect x="24" width="12" height="27" fill="#CE1126" />
          </svg>
        </span>
      );

    // GUINÉE
    case normalized.includes("guinée") || normalized.includes("guinee") || normalized.includes("guinea"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#CE1126" />
            <rect x="12" width="12" height="27" fill="#FCD116" />
            <rect x="24" width="12" height="27" fill="#009460" />
          </svg>
        </span>
      );

    // CONGO
    case normalized.includes("congo") && !normalized.includes("rdc"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <polygon points="0,0 24,0 0,27" fill="#009543" />
            <polygon points="24,0 36,0 12,27 0,27" fill="#FBDE4A" />
            <polygon points="36,0 36,27 12,27" fill="#DC241F" />
          </svg>
        </span>
      );

    // RDC (CONGO-KINSHASA)
    case normalized.includes("rdc") || normalized.includes("kinshasa"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#007FFF" />
            <polygon points="0,27 30,0 36,0 6,27" fill="#CE1126" stroke="#FCD116" strokeWidth="1.5" />
            <polygon
              points="6,4 7,7 10,7 7.5,9 8.5,12 6,10 3.5,12 4.5,9 2,7 5,7"
              fill="#FCD116"
            />
          </svg>
        </span>
      );

    // BURKINA FASO
    case normalized.includes("burkina"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="13.5" fill="#EF3340" />
            <rect y="13.5" width="36" height="13.5" fill="#009739" />
            <polygon
              points="18,9.5 19.3,13.5 23.5,13.5 20.1,16 21.4,20 18,17.5 14.6,20 15.9,16 12.5,13.5 16.7,13.5"
              fill="#FCD116"
            />
          </svg>
        </span>
      );

    // BÉNIN
    case normalized.includes("bénin") || normalized.includes("benin"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="14" height="27" fill="#008850" />
            <rect x="14" width="22" height="13.5" fill="#FCD116" />
            <rect x="14" y="13.5" width="22" height="13.5" fill="#E8112D" />
          </svg>
        </span>
      );

    // TOGO
    case normalized.includes("togo"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="5.4" fill="#006A4E" />
            <rect y="5.4" width="36" height="5.4" fill="#FFCE00" />
            <rect y="10.8" width="36" height="5.4" fill="#006A4E" />
            <rect y="16.2" width="36" height="5.4" fill="#FFCE00" />
            <rect y="21.6" width="36" height="5.4" fill="#006A4E" />
            <rect width="14" height="14" fill="#D21034" />
            <polygon
              points="7,3.5 8,6.5 11,6.5 8.6,8.2 9.5,11.2 7,9.4 4.5,11.2 5.4,8.2 3,6.5 6,6.5"
              fill="#FFFFFF"
            />
          </svg>
        </span>
      );

    // GABON
    case normalized.includes("gabon"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="9" fill="#009E60" />
            <rect y="9" width="36" height="9" fill="#FCD116" />
            <rect y="18" width="36" height="9" fill="#3A75C4" />
          </svg>
        </span>
      );

    // MADAGASCAR
    case normalized.includes("madagascar"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#FFFFFF" />
            <rect x="12" width="24" height="13.5" fill="#FC3D32" />
            <rect x="12" y="13.5" width="24" height="13.5" fill="#007E3A" />
          </svg>
        </span>
      );

    // MAROC
    case normalized.includes("maroc") || normalized.includes("morocco"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#C1272D" />
            <polygon
              points="18,8.5 19.5,13.2 24.3,13.2 20.4,16.1 21.9,20.7 18,17.8 14.1,20.7 15.6,16.1 11.7,13.2 16.5,13.2"
              stroke="#006233"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </span>
      );

    // ALGÉRIE
    case normalized.includes("algérie") || normalized.includes("algerie") || normalized.includes("algeria"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="18" height="27" fill="#006233" />
            <rect x="18" width="18" height="27" fill="#FFFFFF" />
            <circle cx="18" cy="13.5" r="6" fill="#D21034" />
            <circle cx="20" cy="13.5" r="5" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // TUNISIE
    case normalized.includes("tunisie") || normalized.includes("tunisia"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#E70013" />
            <circle cx="18" cy="13.5" r="6.5" fill="#FFFFFF" />
            <circle cx="18" cy="13.5" r="4.5" fill="#E70013" />
            <circle cx="19.5" cy="13.5" r="3.5" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // BELGIQUE
    case normalized.includes("belgique") || normalized.includes("belgium"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="12" height="27" fill="#000000" />
            <rect x="12" width="12" height="27" fill="#FDDA24" />
            <rect x="24" width="12" height="27" fill="#EF3340" />
          </svg>
        </span>
      );

    // SUISSE
    case normalized.includes("suisse") || normalized.includes("switzerland"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#FF0000" />
            <rect x="15" y="6" width="6" height="15" fill="#FFFFFF" />
            <rect x="10.5" y="10.5" width="15" height="6" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // CANADA
    case normalized.includes("canada"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="9" height="27" fill="#FF0000" />
            <rect x="9" width="18" height="27" fill="#FFFFFF" />
            <rect x="27" width="9" height="27" fill="#FF0000" />
            <polygon
              points="18,6 19.5,11 22,10.5 20,13.5 22,15 19,15 18.5,19 17.5,19 17,15 14,15 16,13.5 14,10.5 16.5,11"
              fill="#FF0000"
            />
          </svg>
        </span>
      );

    // NIGER
    case normalized.includes("niger"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="9" fill="#E05206" />
            <rect y="9" width="36" height="9" fill="#FFFFFF" />
            <rect y="18" width="36" height="9" fill="#0DB02B" />
            <circle cx="18" cy="13.5" r="3.5" fill="#E05206" />
          </svg>
        </span>
      );

    // USA / ÉTATS-UNIS
    case normalized.includes("usa") || normalized.includes("états-unis") || normalized.includes("etats-unis") || normalized.includes("united states"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#B22234" />
            <rect y="2.07" width="36" height="2.07" fill="#FFFFFF" />
            <rect y="6.21" width="36" height="2.07" fill="#FFFFFF" />
            <rect y="10.35" width="36" height="2.07" fill="#FFFFFF" />
            <rect y="14.49" width="36" height="2.07" fill="#FFFFFF" />
            <rect y="18.63" width="36" height="2.07" fill="#FFFFFF" />
            <rect y="22.77" width="36" height="2.07" fill="#FFFFFF" />
            <rect width="14.4" height="14.5" fill="#3C3B6E" />
            <circle cx="7.2" cy="7.25" r="3" fill="#FFFFFF" />
          </svg>
        </span>
      );

    // ROYAUME-UNI / UK
    case normalized.includes("royaume-uni") || normalized.includes("uk") || normalized.includes("united kingdom"):
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#012169" />
            <path d="M0,0 L36,27 M36,0 L0,27" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M0,0 L36,27 M36,0 L0,27" stroke="#C8102E" strokeWidth="2" />
            <rect x="15" width="6" height="27" fill="#FFFFFF" />
            <rect y="10.5" width="36" height="6" fill="#FFFFFF" />
            <rect x="16" width="4" height="27" fill="#C8102E" />
            <rect y="11.5" width="36" height="4" fill="#C8102E" />
          </svg>
        </span>
      );

    // DEFAULT (Dabari Elegant Globe Icon)
    default:
      return (
        <span className={svgWrapperClass} style={{ width: size, height }}>
          <svg viewBox="0 0 36 27" width={size} height={height} fill="none">
            <rect width="36" height="27" fill="#F0FDF4" />
            <circle cx="18" cy="13.5" r="9" stroke="#1D6B45" strokeWidth="1.5" />
            <ellipse cx="18" cy="13.5" rx="5" ry="9" stroke="#1D6B45" strokeWidth="1" />
            <line x1="9" y1="13.5" x2="27" y2="13.5" stroke="#1D6B45" strokeWidth="1" />
          </svg>
        </span>
      );
  }
};

export default CountryFlag;
