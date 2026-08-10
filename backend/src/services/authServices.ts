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
        is_email_verified: phone ? true : false,
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

    if (email && verifyCode) {
      await sendEmail({
        to: email,
        subject: "Votre code de vérification Dabari",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2>Bienvenue sur Dabari, ${firstname} ! 🎉</h2>
            <p>Voici votre code de vérification à 6 chiffres pour valider votre compte :</p>
            <div style="font-size: 32px; font-weight: bold; color: #1D6B45; letter-spacing: 6px; margin: 20px 0;">
              ${verifyCode}
            </div>
            <p style="color: #666; font-size: 12px;">Ce code expire dans 15 minutes.</p>
          </div>
        `,
      });
    }

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

    await sendEmail({
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
    });

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
}

export default AuthService;
