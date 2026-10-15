import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db as prisma } from "../db";
import { sendEmail } from "./emailService";

class AuthService {
  static registerUser = async (
    firstname: string,
    lastname: string,
    email?: string,
    phone?: string,
    password?: string,
    address?: string,
  ) => {
    const hashedPassword = await bcrypt.hash(password || "", 10);

    const verifyCode = email
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : null;
    const verifyExpires = email ? new Date(Date.now() + 15 * 60 * 1000) : null;

    const newUser = await prisma.user.create({
      data: {
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        is_email_verified: true, // Activé automatiquement par défaut (sans étape Resend)
        email_verify_code: verifyCode,
        email_verify_expires: verifyExpires,
        profile: {
          create: {
            full_name: `${firstname} ${lastname}`,
            email: email || null,
            phone: phone || null,
            whatsapp: phone || null, // whatsapp par défaut sur le numéro de téléphone
            city: address,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    /* Désactivé temporairement tant que Resend n'est pas configuré avec le domaine
    if (email && verifyCode) {
      sendEmail({
        to: email,
        subject: "Votre code de vérification Dabari",
        html: `...`,
      }).catch((err) =>
        console.error("⚠️ Erreur envoi mail de vérification:", err),
      );
    }
    */

    return newUser.profile;
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
    return prisma.user.findUnique({
      where: { email: email },
      include: {
        profile: true,
      },
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

  static verifyEmailCode = async (email: string, code: string) => {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new Error("Utilisateur introuvable.");
    }

    if (user.is_email_verified) {
      const token = jwt.sign(
        {
          userId: user.id,
          full_name: user.profile?.full_name || "",
          role: user.role,
        },
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "7d" },
      );
      return { message: "Email déjà vérifié.", token };
    }

    // Vérification de l'expiration (15 minutes)
    if (user.email_verify_expires && new Date() > user.email_verify_expires) {
      await prisma.user.delete({ where: { id: user.id } });
      const error: any = new Error("EXPIRED_CODE");
      error.customMessage = "Le délai de 15 minutes a expiré. Votre inscription a été annulée, veuillez recommencer.";
      throw error;
    }

    if (user.email_verify_code !== code.trim()) {
      throw new Error("Code de vérification incorrect.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_email_verified: true,
        email_verify_code: null,
        email_verify_expires: null,
      },
      include: { profile: true },
    });

    const token = jwt.sign(
      {
        userId: updatedUser.id,
        full_name: updatedUser.profile?.full_name || "",
        role: updatedUser.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    );

    return { message: "Email vérifié avec succès !", token };
  };

  static resendVerifyCode = async (email: string) => {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new Error("Aucun compte trouvé avec cet e-mail.");
    }

    if (user.is_email_verified) {
      throw new Error("Cet e-mail est déjà vérifié.");
    }

    if (user.email_verify_expires && new Date() > user.email_verify_expires) {
      await prisma.user.delete({ where: { id: user.id } });
      const error: any = new Error("EXPIRED_CODE");
      error.customMessage = "Le délai de 15 minutes a expiré. Veuillez refaire votre inscription.";
      throw error;
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verify_code: newCode,
        email_verify_expires: newExpires,
      },
    });

    sendEmail({
      to: email,
      subject: "Nouveau code de vérification Dabari",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2>Nouveau code de vérification Dabari</h2>
          <p>Voici votre nouveau code à 6 chiffres :</p>
          <div style="font-size: 32px; font-weight: bold; color: #1D6B45; letter-spacing: 6px; margin: 20px 0;">
            ${newCode}
          </div>
          <p style="color: #666; font-size: 12px;">Ce code expire dans 15 minutes.</p>
        </div>
      `,
    }).catch((err) => console.error("⚠️ Erreur réenvoi mail:", err));

    return { message: "Un nouveau code a été envoyé à votre adresse e-mail." };
  };

  static loginUser = async (emailOrPhone: string, password: string) => {
    const isEmail = emailOrPhone.includes("@");

    const user = isEmail
      ? await this.findUserByEmail(emailOrPhone)
      : await this.findUserByPhone(emailOrPhone);

    if (!user) {
      throw new Error("User not found");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("invalid password");
    }

    // Vérification e-mail
    if (isEmail && !user.is_email_verified) {
      if (user.email_verify_expires && new Date() > user.email_verify_expires) {
        await prisma.user.delete({ where: { id: user.id } });
        const error: any = new Error("EXPIRED_ACCOUNT");
        error.customMessage = "Le délai de 15 minutes est dépassé. Votre inscription a été annulée, veuillez vous réinscrire.";
        throw error;
      }
      const error: any = new Error("UNVERIFIED_EMAIL");
      error.customMessage = "Veuillez vérifier votre adresse e-mail avant de vous connecter.";
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        full_name: user.profile?.full_name || "",
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    );
    return token;
  };
  static deleteUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return await prisma.user.delete({
      where: { id },
    });
  };

  static forgotPassword = async (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(trimmedEmail);

    if (!user) {
      // Pour des raisons de sécurité (anti-énumération), renvoi d'un message générique
      return {
        message:
          "Si cette adresse e-mail correspond à un compte Dabari, un code de réinitialisation vous a été envoyé.",
      };
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verify_code: resetCode,
        email_verify_expires: resetExpires,
      },
    });

    const userName = user.profile?.full_name || "Cher utilisateur";

    await sendEmail({
      to: trimmedEmail,
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
                Bonjour ${userName},<br/>
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

    return {
      message:
        "Si cette adresse e-mail correspond à un compte Dabari, un code de réinitialisation vous a été envoyé.",
    };
  };

  static resetPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!newPassword || newPassword.length < 6) {
      const error: any = new Error("SHORT_PASSWORD");
      error.customMessage =
        "Le nouveau mot de passe doit comporter au moins 6 caractères.";
      throw error;
    }

    const user = await this.findUserByEmail(trimmedEmail);
    if (!user) {
      const error: any = new Error("USER_NOT_FOUND");
      error.customMessage = "Utilisateur introuvable.";
      throw error;
    }

    if (user.email_verify_expires && new Date() > user.email_verify_expires) {
      const error: any = new Error("EXPIRED_CODE");
      error.customMessage =
        "Ce code a expiré (délai de 15 minutes dépassé). Veuillez refaire une demande.";
      throw error;
    }

    if (!user.email_verify_code || user.email_verify_code !== trimmedCode) {
      const error: any = new Error("INVALID_CODE");
      error.customMessage = "Le code de réinitialisation est incorrect.";
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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

    const token = jwt.sign(
      {
        userId: updatedUser.id,
        full_name: updatedUser.profile?.full_name || "",
        role: updatedUser.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    );

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
