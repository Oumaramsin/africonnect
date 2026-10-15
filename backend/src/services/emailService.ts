import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.dabari.fr";

export const escapeHtml = (str?: string | number | null): string => {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const sanitizeDigits = (str?: string | null): string => {
  if (!str) return "";
  return str.replace(/\D/g, "");
};

let testAccountTransporter: nodemailer.Transporter | null = null;
let productionTransporter: nodemailer.Transporter | null = null;

const getTransporter = async () => {
  const host = process.env.SMTP_HOST || "ssl0.ovh.net";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  const isDummyPass = !pass || pass === "votre_mot_de_passe_smtp";

  if (isDummyPass) {
    if (!testAccountTransporter) {
      const testAccount = await nodemailer.createTestAccount();
      testAccountTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
    return { transporter: testAccountTransporter, isEthereal: true };
  }

  if (!productionTransporter) {
    productionTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });
  }

  return {
    transporter: productionTransporter,
    isEthereal: false,
  };
};

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  try {
    const { transporter, isEthereal } = await getTransporter();
    const from = process.env.SMTP_FROM || '"Dabari" <contact@dabari.app>';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    if (isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("\n=======================================================");
      console.log(`[E-MAIL SIMULATION ETHEREAL] À: ${to}`);
      console.log(`[SUJET] ${subject}`);
      console.log(`🔗 LIEN DE PRÉVISUALISATION VISUELLE :`);
      console.log(`${previewUrl}`);
      console.log("=======================================================\n");
      return { success: true, simulated: true, previewUrl };
    }

    console.log(`[EMAIL ENVOYÉ] ID: ${info.messageId} | À: ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL ERREUR] Échec d'envoi d'e-mail:", error);
    return { success: false, error };
  }
};

const SVG_UTENSILS_HEADER = `
  <svg style="vertical-align: middle; margin-left: 6px; width: 24px; height: 24px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2"/>
    <path d="M6 2v20"/>
    <path d="M12 2v20"/>
    <path d="M18 10v12"/>
  </svg>
`;

const SVG_PIN = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="#1D6B45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
`;

const SVG_SHOPPING_BAG = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="#1D6B45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
`;

const SVG_CHECK_CIRCLE = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="#1D6B45" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
`;

const SVG_X_CIRCLE = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="#C62828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
`;

const SVG_CLOCK = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="#D4870A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
`;

const SVG_WHATSAPP = `
  <svg style="vertical-align: middle; margin-right: 8px; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>
  </svg>
`;

const EMAIL_HEADER = `
  <div style="background-color: #1D6B45; padding: 24px; text-align: center; border-top-left-radius: 16px; border-top-right-radius: 16px;">
    <h1 style="color: #ffffff; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 0.5px; display: inline-flex; align-items: center; justify-content: center;">
      Dabari ${SVG_UTENSILS_HEADER}
    </h1>
    <p style="color: #E8F5E9; margin: 6px 0 0 0; font-family: sans-serif; font-size: 13px;">
      Plateforme de Services Traiteur & GP Colis
    </p>
  </div>
`;

const EMAIL_FOOTER = `
  <div style="background-color: #FAF7F2; padding: 20px; text-align: center; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; border-top: 1px solid #EBE5D8; margin-top: 24px;">
    <p style="color: #718096; font-size: 12px; margin: 0; font-family: sans-serif;">
      © ${new Date().getFullYear()} Dabari. Tous droits réservés.
    </p>
    <p style="color: #A0AEC0; font-size: 11px; margin: 6px 0 0 0; font-family: sans-serif;">
      Ceci est un e-mail automatique, merci de ne pas y répondre directement.
    </p>
  </div>
`;

export const sendNewOrderToTraiteurMail = async (data: {
  traiteurEmail: string;
  traiteurName: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  details: string;
  dateEvenement?: string;
  totalAmount?: number;
  type: "PLAT" | "DEVIS";
}) => {
  const isDevis = data.type === "DEVIS";
  const title = isDevis ? "Nouvelle demande de devis traiteur !" : "Nouvelle commande de plats reçue !";

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px;">
            Bonjour ${escapeHtml(data.traiteurName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6;">
            Vous avez reçu une <strong>${isDevis ? "demande de devis" : "nouvelle commande"}</strong> de la part de <span style="color: #1D6B45; font-weight: 600;">${escapeHtml(data.clientName)}</span> !
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PIN} Détails de la demande :
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Client :</strong> ${escapeHtml(data.clientName)}
            </p>
            ${data.clientPhone ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Téléphone / WhatsApp :</strong> <a href="https://wa.me/${sanitizeDigits(data.clientPhone)}" style="color: #1D6B45; text-decoration: none; font-weight: bold;">${escapeHtml(data.clientPhone)}</a></p>` : ''}
            ${data.clientEmail ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>E-mail client :</strong> ${escapeHtml(data.clientEmail)}</p>` : ''}
            ${data.dateEvenement ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Date souhaitée :</strong> ${escapeHtml(data.dateEvenement)}</p>` : ''}
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Montant Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px; white-space: pre-line;">
              <strong>Détails / Plats :</strong><br />${escapeHtml(data.details)}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${FRONTEND_URL}/profil/traiteur" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px rgba(29,107,69,0.2);">
              Gérer mes commandes sur Dabari
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.traiteurEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendOrderNotificationToClientMail = async (data: {
  clientEmail: string;
  clientName: string;
  traiteurName: string;
  traiteurWhatsapp?: string;
  status: "CRÉE" | "ACCEPTÉE" | "REFUSÉE";
  details: string;
  totalAmount?: number;
  messageTraiteur?: string;
}) => {
  const isAccepted = data.status === "ACCEPTÉE";
  const isRefused = data.status === "REFUSÉE";

  let statusBadge = `<span style="background-color: #E8F5E9; color: #1D6B45; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_CHECK_CIRCLE} Commande Acceptée</span>`;
  let title = `Votre commande chez ${data.traiteurName} a été acceptée !`;

  if (isRefused) {
    statusBadge = `<span style="background-color: #FFEBEE; color: #C62828; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_X_CIRCLE} Commande Refusée</span>`;
    title = `Mise à jour concernant votre commande chez ${data.traiteurName}`;
  } else if (data.status === "CRÉE") {
    statusBadge = `<span style="background-color: #FFF8E1; color: #D4870A; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_CLOCK} En attente de confirmation</span>`;
    title = `Votre commande auprès de ${data.traiteurName} a bien été enregistrée`;
  }

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${statusBadge}
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.clientName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            ${title}
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid ${isRefused ? '#C62828' : '#1D6B45'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_SHOPPING_BAG} Récapitulatif :
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Traiteur :</strong> ${escapeHtml(data.traiteurName)}
            </p>
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            ${data.messageTraiteur ? `<div style="background-color: #ffffff; border-radius: 6px; padding: 10px; margin-top: 10px; border: 1px solid #E2E8F0; font-size: 13px; color: #4A5568;"><strong>Message du traiteur :</strong> ${escapeHtml(data.messageTraiteur)}</div>` : ''}

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px; white-space: pre-line;">
              <strong>Détails :</strong><br />${escapeHtml(data.details)}
            </p>
          </div>

          ${isAccepted && data.traiteurWhatsapp ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://wa.me/${sanitizeDigits(data.traiteurWhatsapp)}" 
                 style="background-color: #25D366; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
                ${SVG_WHATSAPP} Contacter le traiteur sur WhatsApp
              </a>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
              Suivre mes commandes sur Dabari
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.clientEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

const SVG_PLANE = `
  <svg style="vertical-align: sub; margin-right: 6px; width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="#1D6B45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0 0-3 2.12 2.12 0 0 0-3 0L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.2c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1Z"/>
  </svg>
`;

export const sendNewGpRequestToGpMail = async (data: {
  gpEmail: string;
  gpName: string;
  senderName: string;
  senderPhone?: string;
  senderEmail?: string;
  departureCity?: string;
  arrivalCity?: string;
  weightKg: number;
  contentDesc: string;
  totalAmount?: number;
}) => {
  const title = `Nouvelle demande de transport de colis (${data.weightKg} kg) !`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px;">
            Bonjour ${escapeHtml(data.gpName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6;">
            Vous avez reçu une nouvelle <strong>demande d'expédition de colis</strong> de la part de <span style="color: #1D6B45; font-weight: 600;">${escapeHtml(data.senderName)}</span> !
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PLANE} Trajet : ${escapeHtml(data.departureCity || 'Départ')} ➔ ${escapeHtml(data.arrivalCity || 'Arrivée')}
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Expéditeur :</strong> ${escapeHtml(data.senderName)}
            </p>
            ${data.senderPhone ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Téléphone / WhatsApp :</strong> <a href="https://wa.me/${sanitizeDigits(data.senderPhone)}" style="color: #1D6B45; text-decoration: none; font-weight: bold;">${escapeHtml(data.senderPhone)}</a></p>` : ''}
            ${data.senderEmail ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>E-mail :</strong> ${escapeHtml(data.senderEmail)}</p>` : ''}
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Poids estimé :</strong> ${data.weightKg} kg</p>
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Prix total estimé :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px;">
              <strong>Description du colis :</strong><br />${escapeHtml(data.contentDesc)}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${FRONTEND_URL}/profil/gp" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px rgba(29,107,69,0.2);">
              Gérer mes demandes GP sur Dabari
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.gpEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendGpRequestStatusToSenderMail = async (data: {
  senderEmail: string;
  senderName: string;
  gpName: string;
  gpPhone?: string;
  status: "CRÉE" | "ACCEPTÉE" | "REFUSÉE";
  departureCity?: string;
  arrivalCity?: string;
  weightKg?: number;
  totalAmount?: number;
  messageGp?: string;
}) => {
  const isAccepted = data.status === "ACCEPTÉE";
  const isRefused = data.status === "REFUSÉE";

  let statusBadge = `<span style="background-color: #E8F5E9; color: #1D6B45; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_CHECK_CIRCLE} Demande GP Acceptée</span>`;
  let title = `Votre demande de colis avec le GP ${data.gpName} a été acceptée !`;

  if (isRefused) {
    statusBadge = `<span style="background-color: #FFEBEE; color: #C62828; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_X_CIRCLE} Demande GP Refusée</span>`;
    title = `Mise à jour concernant votre demande de colis GP`;
  } else if (data.status === "CRÉE") {
    statusBadge = `<span style="background-color: #FFF8E1; color: #D4870A; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">${SVG_CLOCK} En attente de validation</span>`;
    title = `Votre demande de transport de colis a bien été transmise au GP`;
  }

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${statusBadge}
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.senderName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            ${title}
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid ${isRefused ? '#C62828' : '#1D6B45'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PLANE} Trajet : ${escapeHtml(data.departureCity || 'Départ')} ➔ ${escapeHtml(data.arrivalCity || 'Arrivée')}
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>GP Transporteur :</strong> ${escapeHtml(data.gpName)}
            </p>
            ${data.weightKg ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Poids :</strong> ${data.weightKg} kg</p>` : ''}
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            ${data.messageGp ? `<div style="background-color: #ffffff; border-radius: 6px; padding: 10px; margin-top: 10px; border: 1px solid #E2E8F0; font-size: 13px; color: #4A5568;"><strong>Message du GP :</strong> ${escapeHtml(data.messageGp)}</div>` : ''}
          </div>

          ${isAccepted && data.gpPhone ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://wa.me/${sanitizeDigits(data.gpPhone)}" 
                 style="background-color: #25D366; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
                ${SVG_WHATSAPP} Contacter le GP sur WhatsApp
              </a>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
              Suivre mes envois de colis sur Dabari
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.senderEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendEmailVerificationCodeMail = async (data: {
  to: string;
  code: string;
  name?: string;
}) => {
  const title = `Votre code de vérification Dabari : ${data.code}`;
  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px; text-align: center;">
          <h2 style="color: #1A202C; margin-top: 0; font-size: 22px;">
            Bienvenue sur Dabari${data.name ? `, ${data.name}` : ""} !
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; max-width: 480px; margin: 0 auto 20px auto;">
            Merci pour votre inscription. Pour finaliser la création de votre compte et sécuriser vos accès, veuillez saisir le code de validation ci-dessous :
          </p>

          <div style="background-color: #FAF7F2; border: 2px dashed #1D6B45; border-radius: 14px; padding: 22px 16px; margin: 24px auto; max-width: 320px;">
            <p style="color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0; font-weight: 600;">
              Votre code de sécurité
            </p>
            <div style="font-size: 34px; font-weight: 800; color: #1D6B45; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">
              ${data.code}
            </div>
          </div>

          <p style="color: #6B7280; font-size: 12px; margin: 12px 0 0 0;">
            Ce code est valable pendant <strong>15 minutes</strong>.
          </p>
          <p style="color: #9CA3AF; font-size: 11px; margin: 6px 0 0 0;">
            Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail en toute sécurité.
          </p>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.to,
    subject: `Dabari - Code de vérification : ${data.code}`,
    html,
  });
};

export const sendOrderCancelledToTraiteurMail = async (data: {
  traiteurEmail: string;
  traiteurName: string;
  clientName: string;
  orderType: "DEVIS" | "PLAT";
  details?: string;
  dateEvenement?: string;
  totalAmount?: number;
}) => {
  const isDevis = data.orderType === "DEVIS";
  const title = `Commande ${isDevis ? "de devis" : "de plats"} annulée par le client`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #FFEBEE; color: #C62828; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_X_CIRCLE} Commande Annulée
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.traiteurName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            Le client <strong style="color: #1A202C;">${escapeHtml(data.clientName)}</strong> a annulé sa commande (${isDevis ? "demande de devis" : "commande de plats"}).
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #C62828; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #C62828; margin: 0 0 10px 0; font-size: 15px;">
              Détails de la commande annulée :
            </h3>
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Client :</strong> ${escapeHtml(data.clientName)}</p>
            ${data.dateEvenement ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Date prévue :</strong> ${escapeHtml(data.dateEvenement)}</p>` : ""}
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Montant :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ""}
            ${data.details ? `<p style="margin: 6px 0 0 0; color: #4A5568; font-size: 13px; white-space: pre-line;"><strong>Détails :</strong> ${escapeHtml(data.details)}</p>` : ""}
          </div>

          <p style="color: #718096; font-size: 13px; text-align: center;">
            Vous n'avez aucune action à effectuer. Votre planning a été mis à jour automatiquement.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/profil/traiteur" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
              Accéder à mon espace traiteur
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.traiteurEmail,
    subject: `Dabari - ${title} (${data.clientName})`,
    html,
  });
};

export const sendGpRequestCancelledToGpMail = async (data: {
  gpEmail: string;
  gpName: string;
  senderName: string;
  weightKg: number;
  departureCity?: string;
  arrivalCity?: string;
}) => {
  const title = `Demande de colis annulée par l'expéditeur (${data.weightKg} kg libérés)`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #FFEBEE; color: #C62828; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_X_CIRCLE} Demande Colis Annulée
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.gpName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            L'expéditeur <strong style="color: #1A202C;">${escapeHtml(data.senderName)}</strong> a annulé sa réservation de <strong>${escapeHtml(data.weightKg)} kg</strong>.
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 8px 0; font-size: 15px; display: flex; align-items: center;">
              ${SVG_PLANE} Vos kilos ont été recrédités automatiquement :
            </h3>
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Kilos libérés :</strong> ${escapeHtml(data.weightKg)} kg</p>
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Trajet :</strong> ${escapeHtml(data.departureCity || 'Départ')} ➔ ${escapeHtml(data.arrivalCity || 'Arrivée')}</p>
            <p style="margin: 4px 0; color: #718096; font-size: 13px;">Ces kilos sont à nouveau réservables par d'autres expéditeurs sur votre annonce.</p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/profil/gp" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
              Gérer mes annonces GP
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.gpEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendDevisChiffreToClientMail = async (data: {
  clientEmail: string;
  clientName: string;
  traiteurName: string;
  prixDevis: number;
  dateEvenement?: string;
  shouldAutoSign?: boolean;
}) => {
  const title = `Votre devis est prêt chez ${data.traiteurName} (${data.prixDevis.toFixed(2)} €)`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #FFF8E1; color: #D4870A; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_CLOCK} Devis Prêt à Examiner
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.clientName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            Le chef traiteur <strong style="color: #1D6B45;">${escapeHtml(data.traiteurName)}</strong> a étudié votre demande et a fixé son tarif pour votre événement.
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
            <p style="color: #6B7280; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; font-weight: bold;">
              Montant total du devis proposé
            </p>
            <div style="font-size: 32px; font-weight: bold; color: #1D6B45;">
              ${data.prixDevis.toFixed(2)} €
            </div>
            ${data.dateEvenement ? `<p style="margin: 8px 0 0 0; color: #4A5568; font-size: 13px;">Pour votre événement du <strong>${escapeHtml(data.dateEvenement)}</strong></p>` : ""}
            ${data.shouldAutoSign ? `<p style="margin: 8px 0 0 0; color: #1D6B45; font-size: 12px; font-weight: bold;">✍️ Le traiteur a d'ores et déjà apposé sa signature.</p>` : ""}
          </div>

          <p style="color: #4A5568; font-size: 14px; text-align: center; line-height: 1.5;">
            Vous pouvez dès maintenant examiner l'offre, la signer en ligne ou échanger avec le chef traiteur.
          </p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/commandes" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 13px 26px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px rgba(29,107,69,0.2);">
              Examiner et signer mon devis
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.clientEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendDevisSignedToTraiteurMail = async (data: {
  traiteurEmail: string;
  traiteurName: string;
  clientName: string;
  prixDevis: number;
  dateEvenement?: string;
}) => {
  const title = `Devis validé et signé par le client ${data.clientName} !`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #E8F5E9; color: #1D6B45; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_CHECK_CIRCLE} Devis 100% Signé & Validé
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Félicitations chef ${escapeHtml(data.traiteurName)} !
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            Le client <strong style="color: #1D6B45;">${escapeHtml(data.clientName)}</strong> a validé et signé votre proposition de devis !
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 15px;">
              Détails de la prestation confirmée :
            </h3>
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Client :</strong> ${escapeHtml(data.clientName)}</p>
            ${data.dateEvenement ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Date de l'événement :</strong> ${escapeHtml(data.dateEvenement)}</p>` : ""}
            <p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Montant convenu :</strong> ${data.prixDevis.toFixed(2)} €</p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/profil/traiteur" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 13px 26px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 15px;">
              Gérer la prestation sur mon espace traiteur
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.traiteurEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendAcompteNotificationMail = async (data: {
  traiteurEmail: string;
  traiteurName: string;
  clientName: string;
  acompteMontant: number;
  dateEvenement?: string;
  transactionRef?: string;
}) => {
  const title = `Acompte sous séquestre validé (${data.acompteMontant.toFixed(2)} €) !`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #E8F5E9; color: #1D6B45; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_CHECK_CIRCLE} Acompte Sous Séquestre Garanti
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour chef ${escapeHtml(data.traiteurName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            Le client <strong style="color: #1D6B45;">${escapeHtml(data.clientName)}</strong> a validé le versement de son acompte de <strong>${data.acompteMontant.toFixed(2)} €</strong> sous séquestre Dabari.
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Montant sous séquestre :</strong> ${data.acompteMontant.toFixed(2)} €</p>
            ${data.dateEvenement ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Date événement :</strong> ${escapeHtml(data.dateEvenement)}</p>` : ""}
            ${data.transactionRef ? `<p style="margin: 4px 0; color: #6B7280; font-size: 12px;"><strong>Réf. transaction :</strong> ${escapeHtml(data.transactionRef)}</p>` : ""}
            <p style="margin: 8px 0 0 0; color: #1D6B45; font-size: 12px;">
              🛡️ Vos fonds sont conservés en toute sécurité jusqu'à l'exécution de la prestation.
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/profil/traiteur" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 13px 26px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 15px;">
              Voir la commande
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.traiteurEmail,
    subject: `Dabari - ${title}`,
    html,
  });
};

export const sendGpDelayNotificationMail = async (data: {
  senderEmail: string;
  senderName: string;
  gpName: string;
  newArrivalDate: string;
  delayReason?: string;
  departureCity?: string;
  arrivalCity?: string;
}) => {
  const title = `Information retard : décalage sur votre vol GP`;

  const html = `
    <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
        ${EMAIL_HEADER}
        
        <div style="padding: 30px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #FFF8E1; color: #D4870A; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center;">
              ${SVG_CLOCK} Décalage de Trajet Signalé
            </span>
          </div>

          <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; text-align: center;">
            Bonjour ${escapeHtml(data.senderName)},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            Votre transporteur GP <strong style="color: #1D6B45;">${escapeHtml(data.gpName)}</strong> a signalé un ajustement sur son vol / trajet.
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #D4870A; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #D4870A; margin: 0 0 10px 0; font-size: 15px; display: flex; align-items: center;">
              ${SVG_PLANE} Nouvelle date d'arrivée estimée :
            </h3>
            <p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;">
              ${escapeHtml(data.newArrivalDate)}
            </p>
            ${data.departureCity && data.arrivalCity ? `<p style="margin: 4px 0; color: #2D3748; font-size: 13px;">Trajet : ${escapeHtml(data.departureCity)} ➔ ${escapeHtml(data.arrivalCity)}</p>` : ""}
            ${data.delayReason ? `<p style="margin: 6px 0 0 0; color: #4A5568; font-size: 13px;"><strong>Motif :</strong> ${escapeHtml(data.delayReason)}</p>` : ""}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${FRONTEND_URL}/commandes" 
               style="background-color: #1D6B45; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
              Suivre mon colis sur Dabari
            </a>
          </div>
        </div>

        ${EMAIL_FOOTER}
      </div>
    </div>
  `;

  return await sendEmail({
    to: data.senderEmail,
    subject: `Dabari - ${title} (Arrivée : ${data.newArrivalDate})`,
    html,
  });
};

