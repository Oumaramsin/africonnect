import AuthService from "../services/authServices";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";

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
        email,
        phone,
        password,
        passwordConfirmation,
        address,
      } = req.body;
      
      if (
        !firstname ||
        !lastname ||
        (!email && !phone) ||
        !password ||
        !passwordConfirmation
      ) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs requis." });
      }
      
      if (password !== passwordConfirmation) {
        return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
      }
      
      if (email) {
        const existingUser = await AuthService.findUserByEmail(email);
        if (existingUser) {
          // Si le compte existe mais n'est pas vérifié et que les 15 min sont dépassées
          if (
            !existingUser.is_email_verified &&
            existingUser.email_verify_expires &&
            new Date() > existingUser.email_verify_expires
          ) {
            const { db: prisma } = require("../db");
            await prisma.user.delete({ where: { id: existingUser.id } });
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

      const user = await AuthService.registerUser(
        firstname,
        lastname,
        email,
        phone,
        password,
        address,
      );
      return res.status(201).json({
        user,
        requiresVerification: false, // Désactivé temporairement 
        message: "Compte créé avec succès.",
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "registration failed", error });
    }
  };

  static verifyEmail = async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res
          .status(400)
          .json({ message: "L'e-mail et le code à 6 chiffres sont requis." });
      }

      const result = await AuthService.verifyEmailCode(email, code);
      return res.status(200).json(result);
    } catch (error: any) {
      const msg = error.customMessage || error.message || "Vérification échouée.";
      return res.status(400).json({ message: msg, code: error.message });
    }
  };

  static resendCode = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "L'adresse e-mail est requise." });
      }

      const result = await AuthService.resendVerifyCode(email);
      return res.status(200).json(result);
    } catch (error: any) {
      const msg = error.customMessage || error.message || "Impossible de renvoyer le code.";
      return res.status(400).json({ message: msg, code: error.message });
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
      if (!loginIdentifier || !password) {
        return res.status(400).json({ message: "E-mail ou numéro de téléphone et mot de passe requis." });
      }
      
      const token = await AuthService.loginUser(loginIdentifier, password);
      return res.status(200).json({ token });
    } catch (error: any) {
      const msg = error.customMessage || error.message || "login failed";
      res.status(400).json({ message: msg, code: error.message });
    }
  };

  static getUserById = async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const userId = req.params.id;
      const singleId = Array.isArray(userId) ? userId[0] : userId;
      const foundUser = await AuthService.findUserById(singleId);
      if (!foundUser) {
        return res.status(400).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser: foundUser, user: user });
    } catch (error) {
      res.status(400).json({ message: "internal server error", error });
    }
  };

  static updateUserById = async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user as any;
      const userId = req.params.id || user?.userId;
      const singleId = Array.isArray(userId) ? userId[0] : userId;
      
      const { full_name, phone, city, firstname, lastname, address } = req.body;

      const finalName = full_name || (firstname && lastname ? `${firstname} ${lastname}` : undefined);
      const finalCity = city || address;

      const foundUser = await AuthService.updateUser(
        singleId,
        finalName,
        phone,
        finalCity,
      );
      if (!foundUser) {
        return res.status(400).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser: foundUser, user: user });
    } catch (error: any) {
      res.status(400).json({ message: "internal server error", error: error.message });
    }
  };

  static deleteUserById = async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user as any;
      const userId = req.params.id || user?.userId;
      const singleId = Array.isArray(userId) ? userId[0] : userId;
      

      const foundUser = await AuthService.deleteUserById(singleId);
      if (!foundUser) {
        return res.status(400).json({ message: "user not found with this id" });
      }
      return res.status(200).json({ foundUser: foundUser, user: user });
    } catch (error: any) {
      res.status(400).json({ message: "internal server error", error: error.message });
    }
  };
}

export default AuthController;
