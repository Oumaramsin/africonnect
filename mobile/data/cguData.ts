export interface CGUArticle {
  id: number;
  number: string;
  title: string;
  category: "Général" | "Transport GP" | "Sécurité & Douanes" | "Responsabilités" | "Paiement & Séquestre" | "Légal & RGPD";
  summary: string;
  paragraphs: string[];
  bulletPoints?: string[];
}

export interface CGUDocument {
  title: string;
  subtitle: string;
  version: string;
  lastUpdated: string;
  publisher: {
    name: string;
    description: string;
    contactEmail: string;
    legalNote: string;
  };
  keyPillars: {
    icon: string;
    title: string;
    description: string;
  }[];
  articles: CGUArticle[];
}

export const cguData: CGUDocument = {
  title: "Conditions Générales d'Utilisation et de Service",
  subtitle:
    "Plateforme DABARI — Mise en relation pour cotransportage occasionnel de colis & prestations de traiteurs de la diaspora",
  version: "Version officielle 2026.1",
  lastUpdated: "Octobre 2026",
  publisher: {
    name: "DABARI SAS",
    description: "Plateforme numérique d'intermédiation technique et de confiance pour la diaspora africaine",
    contactEmail: "contact@ramsin.fr",
    legalNote:
      "Ce document définit le cadre légal applicable entre Dabari et ses utilisateurs pour le transport solidaire de colis (GP) et les services événementiels traiteurs.",
  },
  keyPillars: [
    {
      icon: "shield-checkmark",
      title: "Cotransportage Conforme",
      description: "Cadre légal strict du partage de frais réels (Art. L. 3232-1 du code des transports).",
    },
    {
      icon: "lock-closed",
      title: "Séquestre Sécurisé",
      description: "Consignation protectrice des acomptes jusqu'à confirmation d'exécution du service.",
    },
    {
      icon: "warning",
      title: "Zéro Tolérance Objets Interdits",
      description: "Contrôle douanier et interdiction stricte de marchandises illicites ou dangereuses.",
    },
  ],
  articles: [
    {
      id: 1,
      number: "Article 1",
      title: "Objet de la Plateforme",
      category: "Général",
      summary: "Définition du service et délimitation du rôle d'intermédiaire technique.",
      paragraphs: [
        "Les présentes Conditions Générales d’Utilisation (« CGU ») ont pour objet de définir les modalités et conditions d’utilisation de la plateforme DABARI (« la Plateforme »), service de mise en relation entre :",
      ],
      bulletPoints: [
        "des particuliers effectuant un déplacement pour leur propre compte et disposant d’une capacité de transport disponible (« le Cotransporteur ») ;",
        "des particuliers souhaitant faire acheminer un colis à l’occasion de ce déplacement (« l’Expéditeur ») ;",
        "ainsi que des clients et traiteurs indépendants proposant des prestations culinaires et banquets événementiels de la diaspora.",
      ],
    },
    {
      id: 2,
      number: "Article 2",
      title: "Qualification juridique de l’activité : le cotransportage",
      category: "Transport GP",
      summary: "Cadre légal impératif du cotransportage de colis à titre non onéreux (partage des frais réels).",
      paragraphs: [
        "2.1. Le service proposé s’inscrit exclusivement dans le cadre du cotransportage tel que défini à l’article L. 3232-1 du code des transports : « l’utilisation en commun, à titre privé, d’un véhicule terrestre à moteur effectuée à titre non onéreux, excepté le partage des frais, pour transporter des colis dans le cadre d’un déplacement qu’un conducteur effectue pour son propre compte ».",
        "2.2. En conséquence, et ceci constitue une condition essentielle d’utilisation de la Plateforme :",
      ],
      bulletPoints: [
        "le déplacement du Cotransporteur doit être réalisé pour son propre compte (voyage personnel, professionnel, familial préexistant), et non organisé dans le seul but de transporter le colis d’autrui ;",
        "la somme versée par l’Expéditeur au Cotransporteur ne peut excéder un partage des frais réels du déplacement (carburant, péage, franchise bagage supplémentaire, billet, etc.) ; elle ne saurait constituer une rémunération commerciale ;",
        "l’activité de Cotransporteur exercée via la Plateforme doit rester occasionnelle et ne peut constituer une activité professionnelle habituelle non déclarée.",
        "2.3. L’utilisateur reconnaît que le dépassement de ce cadre (tarification systématique au kilo, activité répétée à titre lucratif, absence de déplacement personnel réel) ferait sortir son activité du régime du cotransportage et pourrait la faire relever du transport public de marchandises, soumis à immatriculation, capacité professionnelle et fiscalité spécifiques — dont la Plateforme ne saurait être tenue responsable si l’utilisateur y contrevient.",
      ],
    },
    {
      id: 3,
      number: "Article 3",
      title: "Inscription et vérifications",
      category: "Général",
      summary: "Création de compte, contrôle d'identité de bon sens et absence de garantie de solvabilité.",
      paragraphs: [
        "3.1. L’utilisation de la Plateforme suppose la création d’un compte et l’acceptation pleine et entière des présentes CGU.",
        "3.2. La Plateforme peut demander une pièce d’identité et procéder à des vérifications de bon sens (cohérence du trajet déclaré, historique du compte). Ces vérifications ne constituent en aucun cas une garantie de l’identité réelle, de la fiabilité, de la solvabilité ou du comportement des utilisateurs, et n’engagent pas la responsabilité de la Plateforme à ce titre.",
      ],
    },
    {
      id: 4,
      number: "Article 4",
      title: "Formation du contrat entre utilisateurs",
      category: "Général",
      summary: "Le contrat lie exclusivement les utilisateurs ; Dabari demeure tiers au contrat de transport.",
      paragraphs: [
        "4.1. Le contrat de cotransportage (nature, contenu, valeur déclarée du colis, prix du partage de frais, lieux et dates de remise/livraison) est conclu exclusivement entre l’Expéditeur et le Cotransporteur. La Plateforme n’est pas partie à ce contrat.",
        "4.2. Il appartient aux utilisateurs de définir eux-mêmes les modalités de remise du colis, d’en vérifier le contenu à la prise en charge, et de convenir des modalités de preuve (photo, état des lieux contradictoire, accusé de réception) — la Plateforme recommande ces bonnes pratiques sans en imposer ni en garantir l’exécution.",
      ],
    },
    {
      id: 5,
      number: "Article 5",
      title: "Objets et contenus interdits",
      category: "Sécurité & Douanes",
      summary: "Liste d'interdictions strictes, conformité douanière et droit de regard du cotransporteur.",
      paragraphs: [
        "5.1. Sont strictement interdits au transport via la Plateforme, sans que cette liste soit exhaustive :",
      ],
      bulletPoints: [
        "les marchandises dont le transport est interdit ou réglementé par la loi (armes, stupéfiants, produits contrefaits, espèces protégées, biens culturels protégés, matières dangereuses, inflammables, explosives, etc.) ;",
        "l’argent liquide, les métaux et pierres précieuses, les titres au porteur, sauf déclaration explicite acceptée par le Cotransporteur ;",
        "tout objet dont la détention, l’exportation ou l’importation est soumise à autorisation (douane, sanitaire, phytosanitaire, CITES) sans que cette autorisation ait été obtenue par l’Expéditeur ;",
        "tout colis dont le contenu est dissimulé ou frauduleusement déclaré.",
        "5.2. L’Expéditeur est seul responsable de la conformité du colis à la réglementation douanière et fiscale du pays de départ et du pays de destination, y compris les déclarations de valeur et le paiement des droits éventuellement dus. Le Cotransporteur est en droit de refuser ou d’ouvrir un colis pour vérification avant transport.",
        "5.3. Toute violation de cet article engage la seule responsabilité personnelle, y compris pénale, de son auteur. La Plateforme se réserve le droit de suspendre le compte concerné et de transmettre les informations utiles aux autorités compétentes en cas de réquisition légale.",
      ],
    },
    {
      id: 6,
      number: "Article 6",
      title: "Rôle et responsabilité de la Plateforme",
      category: "Responsabilités",
      summary: "Absence de détention des colis, limites légales d'intervention et droit de la consommation.",
      paragraphs: [
        "6.1. La Plateforme fournit un outil de mise en relation (annonces, messagerie, éventuellement paiement séquestré). Elle n’intervient pas dans le transport physique du colis, n’en a jamais la garde, la détention ou le contrôle, et n’est ni transporteur ni commissionnaire de transport au sens du code de commerce ou du code des transports.",
        "6.2. En conséquence, la Plateforme ne peut être tenue responsable :",
      ],
      bulletPoints: [
        "de la perte, du vol, de l’endommagement, du retard ou de la non-remise du colis ;",
        "du contenu réel du colis transporté, de sa valeur, de sa licéité ou de sa conformité aux règles douanières ;",
        "de l’annulation, du retard ou de la modification du déplacement du Cotransporteur (annulation de vol, grève, cas de force majeure) ;",
        "des préjudices indirects (perte de chance, préjudice moral, perte d’exploitation) subis par l’un ou l’autre utilisateur ;",
        "de tout litige, y compris quant au prix convenu, survenant entre l’Expéditeur et le Cotransporteur, la Plateforme n’étant pas partie au contrat de cotransportage.",
        "6.3. La responsabilité de la Plateforme ne pourra être recherchée qu’au titre de ses propres manquements en tant qu’éditeur du service technique de mise en relation (disponibilité de la plateforme, sécurité des données, conformité des informations qu’elle diffuse elle-même), et dans les limites autorisées par la loi.",
        "6.4. Réserve importante : conformément au droit de la consommation, une clause ne peut exonérer totalement un professionnel de sa propre faute ou faute lourde, ni des obligations essentielles du contrat, à l’égard d’un consommateur. Les limitations ci-dessus visent le transport lui-même (fait d’un tiers, l’utilisateur cotransporteur) et non un manquement propre de la Plateforme.",
      ],
    },
    {
      id: 7,
      number: "Article 7",
      title: "Assurance",
      category: "Responsabilités",
      summary: "Absence d'assurance automatique et recommandation de garantie ad hoc pour les objets de valeur.",
      paragraphs: [
        "7.1. La Plateforme ne fournit, sauf mention contraire explicite sur le service souscrit, aucune assurance couvrant la perte, le vol ou la détérioration des colis.",
        "7.2. Il appartient à l’Expéditeur de souscrire, s’il le souhaite, une assurance ad hoc pour les biens de valeur, et de vérifier que son assurance habitation/responsabilité civile ne couvre pas déjà ce type d’envoi. Il est vivement recommandé de ne pas confier au cotransportage occasionnel des biens irremplaçables ou de valeur non assurée.",
      ],
    },
    {
      id: 8,
      number: "Article 8",
      title: "Obligations fiscales et déclaratives des utilisateurs",
      category: "Légal & RGPD",
      summary: "Responsabilité individuelle en matière de fiscalité, douanes et déclarations de revenus.",
      paragraphs: [
        "Chaque utilisateur est seul responsable :",
      ],
      bulletPoints: [
        "de la déclaration et du paiement de tout impôt, taxe ou droit de douane applicable à son activité ou à son envoi ;",
        "du respect des seuils et formalités douanières du pays de départ, de transit et de destination ;",
        "de la requalification éventuelle de son activité en activité commerciale s’il en dépasse le cadre occasionnel défini à l’Article 2, et des conséquences qui en découlent (immatriculation, TVA, cotisations sociales).",
        "La Plateforme n’est pas mandataire fiscal des utilisateurs et ne procède à aucune déclaration en leur nom, sauf obligation légale de déclaration qui s’imposerait directement à elle en matière de revenus perçus via la Plateforme, selon la réglementation applicable aux plateformes d'intermédiation numérique.",
      ],
    },
    {
      id: 9,
      number: "Article 9",
      title: "Paiement, acompte et frais de service (Séquestre Dabari SAS)",
      category: "Paiement & Séquestre",
      summary: "Fonctionnement du séquestre de protection, commission de service et libération des montants.",
      paragraphs: [
        "9.1. La Plateforme met en œuvre un dispositif de séquestre sécurisé permettant de cantonner les acomptes et règlements jusqu'à confirmation de la bonne fin de la prestation convenue (remise du colis vérifié ou réalisation de la prestation culinaire traiteur).",
        "9.2. Une commission ou des frais de service de mise en relation sont prélevés par la Plateforme pour assurer l'infrastructure technique, la modération des profils et le cantonnement sécurisé des fonds.",
        "9.3. En cas d'annulation dûment constatée selon les règles du devis ou de signalement de non-réalisation, le séquestre permet le remboursement de l'acompte consigné selon les conditions applicables.",
      ],
    },
    {
      id: 10,
      number: "Article 10",
      title: "Signalement, suspension et exclusion",
      category: "Sécurité & Douanes",
      summary: "Faculté de suspension immédiate en cas de fraude ou manquement aux règles déontologiques.",
      paragraphs: [
        "La Plateforme peut suspendre ou supprimer, sans préavis, tout compte dont l’utilisation contreviendrait aux présentes CGU, notamment en cas de transport d’objets interdits, de comportement frauduleux, ou d’activité manifestement commerciale déguisée en cotransportage.",
      ],
    },
    {
      id: 11,
      number: "Article 11",
      title: "Données personnelles (RGPD)",
      category: "Légal & RGPD",
      summary: "Traitement confidentiel conforme au RGPD, droits d'accès, de rectification et d'effacement.",
      paragraphs: [
        "11.1. Les données à caractère personnel collectées sont traitées conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.",
        "11.2. Tout utilisateur dispose d'un droit d'accès, de rectification, de portabilité et d'effacement de ses données personnelles, exerçable à tout moment depuis les paramètres de son compte ou par courrier électronique adressé à contact@ramsin.fr.",
      ],
    },
    {
      id: 12,
      number: "Article 12",
      title: "Propriété intellectuelle",
      category: "Légal & RGPD",
      summary: "Protection intégrale des marques, logos, graphismes et architecture technique Dabari.",
      paragraphs: [
        "Les éléments constitutifs de la Plateforme (marque Dabari, logo, charte graphique, interface logicielle, base de données, algorithmes et contenus éditoriaux) demeurent la propriété exclusive de DABARI SAS. Toute reproduction, copie ou extraction non autorisée est formellement prohibée.",
      ],
    },
    {
      id: 13,
      number: "Article 13",
      title: "Modification des CGU",
      category: "Général",
      summary: "Modalités d'évolution des conditions d'utilisation et opposabilité de la version active.",
      paragraphs: [
        "La Plateforme peut modifier les présentes CGU à tout moment ; la version applicable est celle en vigueur au moment de l’utilisation du service. Les utilisateurs seront informés de toute modification substantielle par notification ou mise à jour sur la Plateforme.",
      ],
    },
    {
      id: 14,
      number: "Article 14",
      title: "Droit applicable et règlement des litiges",
      category: "Légal & RGPD",
      summary: "Soumission exclusive au droit français, médiation de la consommation et tribunaux compétents.",
      paragraphs: [
        "14.1. Les présentes CGU sont soumises au droit français.",
        "14.2. En cas de litige relatif à l’utilisation de la Plateforme, les parties s'engagent à rechercher prioritairement une résolution amiable.",
        "14.3. À défaut d'accord amiable, le litige pourra être porté devant un médiateur de la consommation agréé. En cas d'échec de la médiation, compétence exclusive est attribuée aux tribunaux compétents selon les règles du Code de procédure civile et du Code de la consommation.",
        "Note d'information : Ce document formalise le cadre d'intermédiation technique Dabari et protège l'écosystème communautaire.",
      ],
    },
  ],
};
