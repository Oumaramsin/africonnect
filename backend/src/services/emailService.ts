import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

let testAccountTransporter: nodemailer.Transporter | null = null;

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

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    }),
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
            Bonjour ${data.traiteurName},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6;">
            Vous avez reçu une <strong>${isDevis ? "demande de devis" : "nouvelle commande"}</strong> de la part de <span style="color: #1D6B45; font-weight: 600;">${data.clientName}</span> !
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PIN} Détails de la demande :
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Client :</strong> ${data.clientName}
            </p>
            ${data.clientPhone ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Téléphone / WhatsApp :</strong> <a href="https://wa.me/${data.clientPhone.replace(/\+/g, '').replace(/\s/g, '')}" style="color: #1D6B45; text-decoration: none; font-weight: bold;">${data.clientPhone}</a></p>` : ''}
            ${data.clientEmail ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>E-mail client :</strong> ${data.clientEmail}</p>` : ''}
            ${data.dateEvenement ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Date souhaitée :</strong> ${data.dateEvenement}</p>` : ''}
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Montant Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px; white-space: pre-line;">
              <strong>Détails / Plats :</strong><br />${data.details}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profil/traiteur" 
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
            Bonjour ${data.clientName},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            ${title}
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid ${isRefused ? '#C62828' : '#1D6B45'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_SHOPPING_BAG} Récapitulatif :
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Traiteur :</strong> ${data.traiteurName}
            </p>
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            ${data.messageTraiteur ? `<div style="background-color: #ffffff; border-radius: 6px; padding: 10px; margin-top: 10px; border: 1px solid #E2E8F0; font-size: 13px; color: #4A5568;"><strong>Message du traiteur :</strong> ${data.messageTraiteur}</div>` : ''}

            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px; white-space: pre-line;">
              <strong>Détails :</strong><br />${data.details}
            </p>
          </div>

          ${isAccepted && data.traiteurWhatsapp ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://wa.me/${data.traiteurWhatsapp.replace(/\+/g, '').replace(/\s/g, '')}" 
                 style="background-color: #25D366; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
                ${SVG_WHATSAPP} Contacter le traiteur sur WhatsApp
              </a>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/commandes" 
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
            Bonjour ${data.gpName},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6;">
            Vous avez reçu une nouvelle <strong>demande d'expédition de colis</strong> de la part de <span style="color: #1D6B45; font-weight: 600;">${data.senderName}</span> !
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid #1D6B45; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PLANE} Trajet : ${data.departureCity || 'Départ'} ➔ ${data.arrivalCity || 'Arrivée'}
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>Expéditeur :</strong> ${data.senderName}
            </p>
            ${data.senderPhone ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Téléphone / WhatsApp :</strong> <a href="https://wa.me/${data.senderPhone.replace(/\+/g, '').replace(/\s/g, '')}" style="color: #1D6B45; text-decoration: none; font-weight: bold;">${data.senderPhone}</a></p>` : ''}
            ${data.senderEmail ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>E-mail :</strong> ${data.senderEmail}</p>` : ''}
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Poids estimé :</strong> ${data.weightKg} kg</p>
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Prix total estimé :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />
            
            <p style="margin: 4px 0; color: #4A5568; font-size: 14px;">
              <strong>Description du colis :</strong><br />${data.contentDesc}
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profil/gp" 
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
            Bonjour ${data.senderName},
          </h2>
          
          <p style="color: #4A5568; font-size: 15px; line-height: 1.6; text-align: center;">
            ${title}
          </p>

          <div style="background-color: #FAF7F2; border-left: 4px solid ${isRefused ? '#C62828' : '#1D6B45'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #1D6B45; margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center;">
              ${SVG_PLANE} Trajet : ${data.departureCity || 'Départ'} ➔ ${data.arrivalCity || 'Arrivée'}
            </h3>
            
            <p style="margin: 4px 0; color: #2D3748; font-size: 14px;">
              <strong>GP Transporteur :</strong> ${data.gpName}
            </p>
            ${data.weightKg ? `<p style="margin: 4px 0; color: #2D3748; font-size: 14px;"><strong>Poids :</strong> ${data.weightKg} kg</p>` : ''}
            ${data.totalAmount ? `<p style="margin: 4px 0; color: #1D6B45; font-size: 16px; font-weight: bold;"><strong>Total :</strong> ${data.totalAmount.toFixed(2)} €</p>` : ''}
            
            ${data.messageGp ? `<div style="background-color: #ffffff; border-radius: 6px; padding: 10px; margin-top: 10px; border: 1px solid #E2E8F0; font-size: 13px; color: #4A5568;"><strong>Message du GP :</strong> ${data.messageGp}</div>` : ''}
          </div>

          ${isAccepted && data.gpPhone ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://wa.me/${data.gpPhone.replace(/\+/g, '').replace(/\s/g, '')}" 
                 style="background-color: #25D366; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 14px;">
                ${SVG_WHATSAPP} Contacter le GP sur WhatsApp
              </a>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/commandes" 
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
