import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db as prisma } from "../db";
import { sendEmail, sendEmailVerificationCodeMail, escapeHtml } from "./emailService";
import { signToken } from "../utils/jwt";
import { AttemptLimiter } from "../utils/attemptLimiter";
import {
  generateNumericCode,
  isSyntheticEmail,
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  safeEqual,
} from "../utils/validation";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

// 5 essais de code par compte et par 15 minutes, même si de nouveaux codes sont demandés entre-temps
// (le compteur n'est remis à zéro qu'après un succès) : la force brute devient impossible même avec plusieurs IP.
const codeAttempts = new AttemptLimiter(MAX_CODE_ATTEMPTS, CODE_TTL_MS);
// Verrouillage ciblé des connexions sur 15 minutes : 10 échecs par couple (identifiant, IP), pour
// qu'un attaquant ne puisse pas bloquer la victime depuis sa propre adresse, et un plafond global
// de 50 échecs par identifiant contre une attaque distribuée sur de nombreuses IP.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttemptsByIp = new AttemptLimiter(10, LOGIN_WINDOW_MS);
const loginAttemptsGlobal = new AttemptLimiter(50, LOGIN_WINDOW_MS);
// Un seul e-mail de code par adresse et par minute (anti-bombardement de boîte mail).
const emailCooldown = new AttemptLimiter(1, 60 * 1000);

// Hash factice comparé quand le compte n'existe pas : temps de réponse identique (anti-énumération).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

/**
 * Vérification de l'adresse e-mail par code à 6 chiffres à l'inscription. Désactivée tant que l'envoi
 * d'e-mails n'est pas branché : l'inscription ouvre alors directement la session. Le parcours complet
 * (code, renvoi, saisie sur le site et l'application) est conservé et se réactive avec
 * EMAIL_VERIFICATION_ENABLED=true.
 */
export const isEmailVerificationEnabled = (): boolean =>
  process.env.EMAIL_VERIFICATION_ENABLED === "true";

const authError = (code: string, customMessage: string) => {
  const error: any = new Error(code);
  error.customMessage = customMessage;
  return error;
};

class AuthService {
  static registerUser = async (data: {
    firstname: string;
    lastname: string;
    email: string | null;
    phone: string | null;
    password: string;
    address?: string;
  }) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const isEmailRegistration = Boolean(data.email && !isSyntheticEmail(data.email));
    // Code à saisir seulement pour une adresse e-mail réelle et si la vérification est activée
    const requiresVerification = isEmailRegistration && isEmailVerificationEnabled();
    const verifyCode = requiresVerification ? generateNumericCode() : null;
    const verifyExpires = requiresVerification ? new Date(Date.now() + CODE_TTL_MS) : null;

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        // Compte actif d'emblée (téléphone, ou vérification e-mail désactivée) ; sinon après le code
        is_email_verified: !requiresVerification,
        email_verify_code: verifyCode,
        email_verify_expires: verifyExpires,
        profile: {
          create: {
            full_name: `${data.firstname} ${data.lastname}`.trim(),
            email: data.email,
            phone: data.phone,
            whatsapp: data.phone, // whatsapp par défaut sur le numéro de téléphone
            city: data.address,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    if (requiresVerification && data.email && verifyCode) {
      emailCooldown.hit(`verify:${data.email}`);
      sendEmailVerificationCodeMail({
        to: data.email,
        code: verifyCode,
        name: data.firstname,
      }).catch((err) =>
        console.error("⚠️ Erreur envoi mail de vérification:", err),
      );
    }

    // Aucun code à saisir : la session s'ouvre dès l'inscription (comme après une connexion)
    const token = requiresVerification
      ? null
      : signToken({
          id: newUser.id,
          role: newUser.role,
          password: newUser.password,
          full_name: newUser.profile?.full_name,
        });

    return { profile: newUser.profile, requiresVerification, token };
  };

  static findUserById = async (id: string) => {
    return prisma.profile.findUnique({
      where: { id: id },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        phone: true,
        city: true,
        created_at: true,
        traiteurs: {
          select: { id: true, name: true, is_active: true },
        },
        gp_listings: {
          select: { id: true, is_active: true },
        },
      },
    });
  };

  static findUserByEmail = async (email: string) => {
    const exact = await prisma.user.findUnique({
      where: { email: email },
      include: { profile: true },
    });
    if (exact) return exact;

    // Comptes historiques enregistrés avec des majuscules
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { profile: true },
    });
  };

  static findUserByPhone = async (phone: string) => {
    return prisma.user.findUnique({
      where: { phone: phone },
      include: {
        profile: true,
      },
    });
  };

  static updateUser = async (
    id: string,
    full_name?: string,
    phone?: string,
    city?: string,
  ) => {
    return prisma.profile.update({
      where: { id: id },
      data: {
        full_name: full_name,
        phone: phone,
        city: city,
      },
    });
  };

  /** Enregistre un code erroné ; au-delà du seuil, le code est invalidé en base. */
  private static registerCodeFailure = async (userId: string) => {
    if (codeAttempts.hit(userId) >= MAX_CODE_ATTEMPTS) {
      await prisma.user.update({
        where: { id: userId },
        data: { email_verify_code: null },
      });
    }
  };

  private static assertCodeUsable = (user: { id: string; email_verify_expires: Date | null }) => {
    if (codeAttempts.isBlocked(user.id)) {
      throw authError(
        "TOO_MANY_ATTEMPTS",
        "Trop de tentatives incorrectes. Veuillez patienter 15 minutes puis demander un nouveau code.",
      );
    }
    if (user.email_verify_expires && new Date() > user.email_verify_expires) {
      throw authError(
        "EXPIRED_CODE",
        "Le code a expiré (délai de 15 minutes dépassé). Veuillez demander un nouveau code.",
      );
    }
  };

  static verifyEmailCode = async (email: string, code: string) => {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw authError("INVALID_CODE", "Code de vérification incorrect.");
    }

    // Aucun jeton n'est délivré ici : seul un code valide (ou la connexion) ouvre une session.
    if (user.is_email_verified) {
      return { message: "Adresse e-mail déjà vérifiée. Vous pouvez vous connecter." };
    }

    this.assertCodeUsable(user);

    if (!user.email_verify_code || !safeEqual(user.email_verify_code, code.trim())) {
      await this.registerCodeFailure(user.id);
      throw authError("INVALID_CODE", "Code de vérification incorrect.");
    }

    codeAttempts.reset(user.id);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_email_verified: true,
        email_verify_code: null,
        email_verify_expires: null,
      },
      include: { profile: true },
    });

    const token = signToken({
      id: updatedUser.id,
      role: updatedUser.role,
      password: updatedUser.password,
      full_name: updatedUser.profile?.full_name,
    });

    return { message: "Email vérifié avec succès !", token };
  };

  static resendVerifyCode = async (email: string) => {
    const genericResponse = {
      message:
        "Si un compte en attente de vérification existe pour cette adresse, un nouveau code vient de vous être envoyé.",
    };

    const cooldownKey = `verify:${email}`;
    if (emailCooldown.isBlocked(cooldownKey)) {
      throw authError(
        "RESEND_COOLDOWN",
        "Veuillez patienter une minute avant de demander un nouveau code.",
      );
    }
    emailCooldown.hit(cooldownKey);

    const user = await this.findUserByEmail(email);
    if (!user || user.is_email_verified || !user.email || isSyntheticEmail(user.email)) {
      return genericResponse;
    }

    // Génération d'un nouveau code avec nouveau délai de 15 minutes
    const newCode = generateNumericCode();
    const newExpires = new Date(Date.now() + CODE_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verify_code: newCode,
        email_verify_expires: newExpires,
      },
    });

    sendEmailVerificationCodeMail({
      to: user.email,
      code: newCode,
      name: user.profile?.full_name || undefined,
    }).catch((err) => console.error("⚠️ Erreur réenvoi mail:", err));

    return genericResponse;
  };

  static loginUser = async (emailOrPhone: string, password: string, clientIp: string) => {
    const identifier = emailOrPhone.trim();
    const attemptKey = identifier.toLowerCase();
    const pairKey = `${attemptKey}|${clientIp}`;

    if (loginAttemptsByIp.isBlocked(pairKey) || loginAttemptsGlobal.isBlocked(attemptKey)) {
      throw authError(
        "TOO_MANY_ATTEMPTS",
        "Trop de tentatives de connexion pour ce compte. Veuillez réessayer dans 15 minutes.",
      );
    }

    const isEmail = identifier.includes("@");
    const user = isEmail
      ? await this.findUserByEmail(identifier.toLowerCase())
      : await this.findUserByPhone(identifier);

    // Message unique que le compte existe ou non (anti-énumération des comptes)
    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      loginAttemptsByIp.hit(pairKey);
      loginAttemptsGlobal.hit(attemptKey);
      throw authError("INVALID_CREDENTIALS", "Identifiants incorrects.");
    }
    // Seul le compteur de ce couple est remis à zéro : le plafond global expire avec sa fenêtre
    loginAttemptsByIp.reset(pairKey);

    // Vérification désactivée : un compte resté en attente de code (inscrit quand elle était active,
    // e-mail jamais reçu) est activé à sa première connexion réussie, au lieu d'être bloqué puis
    // supprimé à l'expiration du code.
    if (!user.is_email_verified && !isEmailVerificationEnabled()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { is_email_verified: true, email_verify_code: null, email_verify_expires: null },
      });
      user.is_email_verified = true;
    }

    // Vérification e-mail obligatoire quel que soit l'identifiant utilisé (e-mail ou téléphone)
    if (!user.is_email_verified) {
      if (user.email_verify_expires && new Date() > user.email_verify_expires) {
        await prisma.user.delete({ where: { id: user.id } });
        throw authError(
          "EXPIRED_ACCOUNT",
          "Le délai de 15 minutes est dépassé. Votre inscription a été annulée, veuillez vous réinscrire.",
        );
      }
      throw authError(
        "UNVERIFIED_EMAIL",
        "Veuillez vérifier votre adresse e-mail avant de vous connecter.",
      );
    }

    return signToken({
      id: user.id,
      role: user.role,
      password: user.password,
      full_name: user.profile?.full_name,
    });
  };

  static deleteUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    return await prisma.$transaction(async (tx) => {
      // La suppression du profil passe les relations à NULL : sans désactivation préalable, le
      // traiteur et les annonces GP resteraient publiés (et commandables) sans propriétaire.
      // Fiche retirée du site (404) ; le numéro WhatsApp, donnée personnelle, est effacé. Le nom et la
      // description restent pour l'historique des devis signés ; ses offres en attente ne sont plus
      // affichées ni acceptables (traiteur inactif).
      await tx.traiteur.updateMany({
        where: { user_id: id },
        data: { is_active: false, whatsapp: null },
      });
      await tx.gpListing.updateMany({
        where: { gp_id: id },
        data: { is_active: false },
      });
      // Notifications du compte : sans titulaire, elles ne servent plus (politique de confidentialité)
      await tx.notification.deleteMany({ where: { user_id: id } });
      return await tx.user.delete({
        where: { id },
        select: { id: true },
      });
    });
  };

  /** Vrai si un e-mail de code a été envoyé à cette adresse il y a moins d'une minute. */
  static isVerifyEmailCoolingDown = (email: string) => emailCooldown.isBlocked(`verify:${email}`);

  /** Vrai si le mot de passe correspond au hash enregistré du compte. */
  static passwordMatches = async (user: { password: string }, password: string) =>
    bcrypt.compare(password, user.password);

  static forgotPassword = async (email: string) => {
    // Pour des raisons de sécurité (anti-énumération), même réponse que le compte existe ou non
    const genericResponse = {
      message:
        "Si cette adresse e-mail correspond à un compte Dabari, un code de réinitialisation vous a été envoyé.",
    };

    const cooldownKey = `reset:${email}`;
    if (isSyntheticEmail(email) || emailCooldown.isBlocked(cooldownKey)) {
      return genericResponse;
    }
    emailCooldown.hit(cooldownKey);

    const user = await this.findUserByEmail(email);
    if (!user || !user.email || isSyntheticEmail(user.email)) {
      return genericResponse;
    }

    // Compte non vérifié : pas de code de réinitialisation. Il remplacerait le code d'inscription et
    // repousserait l'expiration de l'inscription en attente (adresse e-mail squattée indéfiniment).
    // L'utilisateur termine son inscription (renvoi du code) ou se réinscrit.
    if (!user.is_email_verified) {
      return genericResponse;
    }

    const resetCode = generateNumericCode();
    const resetExpires = new Date(Date.now() + CODE_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verify_code: resetCode,
        email_verify_expires: resetExpires,
      },
    });

    const userName = user.profile?.full_name || "Cher utilisateur";

    // Envoi non bloquant : le temps de réponse ne révèle pas l'existence du compte
    sendEmail({
      to: user.email,
      subject: "Dabari - Réinitialisation de votre mot de passe",
      html: `
        <div style="background-color: #F4F0E8; padding: 30px 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden;">
            <div style="background-color: #1D6B45; padding: 26px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">
                Dabari
              </h1>
              <p style="color: #E8F5E9; margin: 6px 0 0 0; font-size: 13px;">
                Sécurité & Authentification
              </p>
            </div>

            <div style="padding: 32px 24px; text-align: center;">
              <h2 style="color: #1A202C; margin-top: 0; font-size: 20px; font-weight: 700;">
                Réinitialisation de mot de passe
              </h2>
              <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 12px 0 24px 0;">
                Bonjour ${escapeHtml(userName)},<br/>
                Nous avons reçu une demande de réinitialisation pour votre compte Dabari. Saisissez le code suivant pour définir votre nouveau mot de passe :
              </p>

              <div style="background-color: #ECFDF5; border: 2px dashed #10B981; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px auto;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #065F46; font-family: monospace;">
                  ${resetCode}
                </span>
              </div>

              <p style="color: #6B7280; font-size: 12px; margin: 0 0 8px 0;">
                 Ce code est valable pendant <strong>15 minutes</strong>.
              </p>
              <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
                Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
              </p>
            </div>

            <div style="background-color: #FAF7F2; padding: 16px; text-align: center; border-top: 1px solid #EBE5D8;">
              <p style="color: #718096; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} Dabari. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error("[Auth] Erreur envoi email reset password:", err);
    });

    return genericResponse;
  };

  static resetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    const trimmedCode = code.trim();

    if (!isValidPassword(newPassword)) {
      throw authError(
        "SHORT_PASSWORD",
        `Le nouveau mot de passe doit comporter entre ${PASSWORD_MIN_LENGTH} et 128 caractères.`,
      );
    }

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw authError("INVALID_CODE", "Le code de réinitialisation est incorrect.");
    }

    this.assertCodeUsable(user);

    if (!user.email_verify_code || !safeEqual(user.email_verify_code, trimmedCode)) {
      await this.registerCodeFailure(user.id);
      throw authError("INVALID_CODE", "Le code de réinitialisation est incorrect.");
    }

    codeAttempts.reset(user.id);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Le nouveau hash change l'empreinte des jetons : toutes les anciennes sessions sont révoquées.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        email_verify_code: null,
        email_verify_expires: null,
        is_email_verified: true,
      },
      include: { profile: true },
    });

    // Les appareils enregistrés pour les notifications push sont aussi déconnectés : une personne qui
    // aurait eu accès au compte ne reçoit plus ses notifications (montants, messages, adresses).
    await prisma.pushToken.deleteMany({ where: { user_id: updatedUser.id } }).catch((error) => {
      console.error("Erreur suppression des jetons push après réinitialisation :", error);
    });

    const token = signToken({
      id: updatedUser.id,
      role: updatedUser.role,
      password: updatedUser.password,
      full_name: updatedUser.profile?.full_name,
    });

    return {
      message: "Votre mot de passe a été réinitialisé avec succès !",
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.profile?.full_name,
        role: updatedUser.role,
      },
    };
  };
}

export default AuthService;
