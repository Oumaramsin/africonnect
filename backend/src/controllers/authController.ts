import AuthService from "../services/authServices";
import { Request, Response } from "express";
import { getAuthUserId, isUserAdmin, isValidUUID } from "../utils/types";
import { clearSessionCookies, getClientIp, sendSession } from "../utils/webClient";
import {
  getPublicErrorCode,
  getPublicErrorMessage,
  isOptionalTextWithin,
  isRequiredTextWithin,
  isSyntheticEmail,
  isValidPassword,
  isValidPhone,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
} from "../utils/validation";

/**
 * Vérifie que l'utilisateur authentifié agit sur son propre compte (ou est administrateur).
 * Retourne l'identifiant cible, ou null si la réponse d'erreur a déjà été envoyée.
 */
const resolveOwnAccountId = (req: Request, res: Response): string | null => {
  const requesterId = getAuthUserId(req);
  const targetId = req.params.id || requesterId;

  if (!requesterId) {
    res.status(401).json({ message: "Non autorisé" });
    return null;
  }
  if (!targetId || !isValidUUID(targetId)) {
    res.status(400).json({ message: "Identifiant utilisateur invalide." });
    return null;
  }
  // Sécurité IDOR : un utilisateur ne peut consulter / modifier / supprimer que son propre compte
  if (targetId !== requesterId && !isUserAdmin(req)) {
    res.status(403).json({ message: "Accès refusé." });
    return null;
  }
  return targetId;
};

class AuthController {
  static signup = async (req: Request, res: Response) => {
    try {
      // Détection de bot via faux champ Honeypot
      if (req.body.honeypot || req.body.website) {
        return res.status(400).json({ message: "Requête refusée (détection de bot)." });
      }

      const {
        firstname,
        lastname,
        email: rawEmail,
        phone: rawPhone,
        password,
        passwordConfirmation,
        address,
      } = req.body;

      const hasEmail = typeof rawEmail === "string" && rawEmail.trim() !== "";
      const hasPhone = typeof rawPhone === "string" && rawPhone.trim() !== "";

      if (
        !isRequiredTextWithin(firstname, 60) ||
        typeof lastname !== "string" ||
        (!hasEmail && !hasPhone) ||
        !password ||
        !passwordConfirmation
      ) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs requis." });
      }

      if (lastname.length > 60 || !isOptionalTextWithin(address, 200)) {
        return res.status(400).json({ message: "Certains champs dépassent la longueur autorisée." });
      }

      const email = hasEmail ? normalizeEmail(rawEmail) : null;
      if (hasEmail && !email) {
        return res.status(400).json({ message: "Adresse e-mail invalide." });
      }

      const phone = hasPhone ? rawPhone.trim() : null;
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Numéro de téléphone invalide." });
      }

      // Les adresses techniques @dabari.app ne sont pas vérifiées par e-mail : elles ne sont
      // acceptées que si elles correspondent au numéro de téléphone fourni (anti-usurpation
      // d'adresses officielles du type contact@dabari.app).
      if (email && isSyntheticEmail(email)) {
        const localPart = email.split("@")[0];
        const phoneDigits = phone ? phone.replace(/\D/g, "") : "";
        if (!phoneDigits || !/^[0-9().-]+$/.test(localPart) || localPart.replace(/\D/g, "") !== phoneDigits) {
          return res.status(400).json({ message: "Adresse e-mail invalide." });
        }
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({
          message: `Le mot de passe doit comporter entre ${PASSWORD_MIN_LENGTH} et 128 caractères.`,
        });
      }

      if (password !== passwordConfirmation) {
        return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
      }

      if (email) {
        const existingUser = await AuthService.findUserByEmail(email);
        if (existingUser) {
          const hasPendingCode =
            !existingUser.is_email_verified &&
            Boolean(existingUser.email_verify_code) &&
            Boolean(existingUser.email_verify_expires) &&
            new Date() <= (existingUser.email_verify_expires as Date);

          // Si le compte existe mais n'est pas vérifié et que les 15 min sont dépassées
          if (
            !existingUser.is_email_verified &&
            existingUser.email_verify_expires &&
            new Date() > existingUser.email_verify_expires
          ) {
            await AuthService.deleteUserById(existingUser.id);
          } else if (hasPendingCode) {
            // Inscription rejouée (double envoi, réponse perdue) : même réponse qu'une inscription
            // réussie, l'utilisateur passe à la saisie du code déjà envoyé.
            if (await AuthService.passwordMatches(existingUser, password)) {
              return res.status(201).json({
                user: existingUser.profile,
                requiresVerification: true,
                message: "Un code de vérification à 6 chiffres a été envoyé à votre adresse e-mail.",
              });
            }
            // Autre mot de passe : la dernière inscription remplace celle en attente (nouveau code
            // envoyé à l'adresse). Une inscription non vérifiée ne contient aucune donnée.
            // Au plus un e-mail de code par minute et par adresse (anti-bombardement de boîte mail).
            if (AuthService.isVerifyEmailCoolingDown(email)) {
              return res.status(429).json({
                message:
                  "Un code vient d'être envoyé à cette adresse : patientez une minute avant de recommencer l'inscription.",
              });
            }
            await AuthService.deleteUserById(existingUser.id);
          } else if (!existingUser.is_email_verified) {
            return res.status(400).json({
              message:
                "Un code vous a déjà été envoyé. Veuillez vérifier votre boîte e-mail ou réessayer après 15 minutes.",
            });
          } else {
            return res
              .status(400)
              .json({ message: "Cet e-mail est déjà enregistré." });
          }
        }
      }

      if (phone) {
        const existingUser = await AuthService.findUserByPhone(phone);
        if (existingUser) {
          return res.status(400).json({
            message: "Ce numéro de téléphone est déjà enregistré.",
          });
        }
      }

      const user = await AuthService.registerUser({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email,
        phone,
        password,
        address: typeof address === "string" ? address.trim() : undefined,
      });
      const isEmailReg = Boolean(email && !isSyntheticEmail(email));
      return res.status(201).json({
        user,
        requiresVerification: isEmailReg,
        message: isEmailReg
          ? "Un code de vérification à 6 chiffres a été envoyé à votre adresse e-mail."
          : "Compte créé avec succès.",
      });
    } catch (error: any) {
      console.error("[Auth] Erreur inscription:", error);
      res.status(400).json({ message: getPublicErrorMessage(error, "L'inscription a échoué. Veuillez réessayer.") });
    }
  };

  static verifyEmail = async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, code } = req.body;
      const email = normalizeEmail(rawEmail);
      if (!email || typeof code !== "string" || !code.trim()) {
        return res
          .status(400)
          .json({ message: "L'e-mail et le code à 6 chiffres sont requis." });
      }

      const { token, ...result } = await AuthService.verifyEmailCode(email, code);
      if (!token) {
        return res.status(200).json(result);
      }
      return sendSession(req, res, token, result);
    } catch (error: any) {
      const msg = getPublicErrorMessage(error, "Vérification échouée.");
      return res.status(400).json({ message: msg, code: getPublicErrorCode(error) });
    }
  };

  static resendCode = async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(req.body.email);
      if (!email) {
        return res.status(400).json({ message: "L'adresse e-mail est requise." });
      }

      const result = await AuthService.resendVerifyCode(email);
      return res.status(200).json(result);
    } catch (error: any) {
      const msg = getPublicErrorMessage(error, "Impossible de renvoyer le code.");
      return res.status(400).json({ message: msg, code: getPublicErrorCode(error) });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      // Détection de bot via faux champ Honeypot
      if (req.body.honeypot || req.body.website) {
        return res.status(400).json({ message: "Requête refusée (détection de bot)." });
      }

      const { email, phone, password } = req.body;
      const loginIdentifier = email || phone;
      if (
        typeof loginIdentifier !== "string" ||
        !loginIdentifier.trim() ||
        loginIdentifier.length > 254 ||
        typeof password !== "string" ||
        !password ||
        password.length > 1024
      ) {
        return res.status(400).json({ message: "E-mail ou numéro de téléphone et mot de passe requis." });
      }

      const token = await AuthService.loginUser(loginIdentifier, password, getClientIp(req));
      return sendSession(req, res, token, { message: "Connexion réussie." });
    } catch (error: any) {
      const msg = getPublicErrorMessage(error, "La connexion a échoué.");
      res.status(400).json({ message: msg, code: getPublicErrorCode(error) });
    }
  };

  static getUserById = async (req: Request, res: Response) => {
    try {
      const targetId = resolveOwnAccountId(req, res);
      if (!targetId) return;

      const foundUser = await AuthService.findUserById(targetId);
      if (!foundUser) {
        return res.status(404).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser });
    } catch (error) {
      console.error("[Auth] Erreur lecture profil:", error);
      res.status(500).json({ message: "internal server error" });
    }
  };

  static updateUserById = async (req: Request, res: Response) => {
    try {
      const targetId = resolveOwnAccountId(req, res);
      if (!targetId) return;

      const { full_name, phone, city, firstname, lastname, address } = req.body;

      if (
        !isOptionalTextWithin(full_name, 120) ||
        !isOptionalTextWithin(firstname, 60) ||
        !isOptionalTextWithin(lastname, 60) ||
        !isOptionalTextWithin(city, 200) ||
        !isOptionalTextWithin(address, 200)
      ) {
        return res.status(400).json({ message: "Certains champs sont invalides ou trop longs." });
      }

      if (phone !== undefined && phone !== null && phone !== "" && !isValidPhone(phone)) {
        return res.status(400).json({ message: "Numéro de téléphone invalide." });
      }

      const finalName = full_name?.trim() || (firstname && lastname ? `${firstname.trim()} ${lastname.trim()}` : undefined);
      const finalCity = city ?? address;

      const foundUser = await AuthService.updateUser(
        targetId,
        finalName,
        typeof phone === "string" ? phone.trim() : undefined,
        typeof finalCity === "string" ? finalCity.trim() : undefined,
      );
      if (!foundUser) {
        return res.status(404).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser });
    } catch (error: any) {
      console.error("[Auth] Erreur mise à jour profil:", error);
      res.status(400).json({ message: getPublicErrorMessage(error, "Erreur lors de la mise à jour du profil.") });
    }
  };

  static deleteUserById = async (req: Request, res: Response) => {
    try {
      const targetId = resolveOwnAccountId(req, res);
      if (!targetId) return;

      const deletedUser = await AuthService.deleteUserById(targetId);
      if (!deletedUser) {
        return res.status(404).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser: deletedUser });
    } catch (error: any) {
      console.error("[Auth] Erreur suppression compte:", error);
      res.status(400).json({ message: getPublicErrorMessage(error, "Impossible de supprimer le compte.") });
    }
  };

  static forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, honeypot, website } = req.body;
      if (honeypot || website) {
        return res.status(400).json({ message: "Requête refusée (détection de bot)." });
      }
      const email = normalizeEmail(rawEmail);
      if (!email) {
        return res.status(400).json({ message: "Veuillez renseigner une adresse e-mail valide." });
      }

      const result = await AuthService.forgotPassword(email);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("[Auth] Erreur forgotPassword:", error);
      return res.status(400).json({ message: getPublicErrorMessage(error, "Erreur serveur.") });
    }
  };

  static resetPassword = async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, code, newPassword, honeypot, website } = req.body;
      if (honeypot || website) {
        return res.status(400).json({ message: "Requête refusée (détection de bot)." });
      }
      const email = normalizeEmail(rawEmail);
      if (!email || typeof code !== "string" || !code.trim() || typeof newPassword !== "string" || !newPassword) {
        return res.status(400).json({
          message: "L'adresse e-mail, le code à 6 chiffres et le nouveau mot de passe sont obligatoires.",
        });
      }

      const { token, ...result } = await AuthService.resetPassword(email, code, newPassword);
      return sendSession(req, res, token, result);
    } catch (error: any) {
      console.error("[Auth] Erreur resetPassword:", error);
      return res.status(400).json({ message: getPublicErrorMessage(error, "Erreur lors de la réinitialisation.") });
    }
  };

  /** Utilisateur de la session courante (cookie web ou Bearer) : le front n'a plus à décoder le JWT. */
  static me = async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Non autorisé" });
      }

      const profile = await AuthService.findUserById(userId);
      if (!profile) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }
      // `role` : rôle métier du profil (client, traiteur, gp...) ; `is_admin` : rôle du compte
      // (users.role), seul pris en compte par l'API pour les droits d'administration
      return res.status(200).json({ user: { ...profile, is_admin: isUserAdmin(req) } });
    } catch (error) {
      console.error("[Auth] Erreur lecture session:", error);
      res.status(500).json({ message: "internal server error" });
    }
  };

  /** Déconnexion du site web : efface les cookies de session (sans effet pour les clients Bearer). */
  static logout = (req: Request, res: Response) => {
    clearSessionCookies(req, res);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ message: "Vous êtes déconnecté." });
  };
}

export default AuthController;
