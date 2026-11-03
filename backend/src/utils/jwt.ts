import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256" as const;
/** Durée de vie des jetons (7 jours), reprise par les cookies de session du site web. */
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET manquant : impossible de signer ou vérifier les jetons.");
  }
  return secret;
};

/**
 * Empreinte du hash de mot de passe embarquée dans le jeton : tout changement
 * de mot de passe invalide immédiatement les jetons émis auparavant.
 */
export const passwordFingerprint = (passwordHash: string): string =>
  crypto
    .createHmac("sha256", getJwtSecret())
    .update(passwordHash)
    .digest("hex")
    .slice(0, 32);

export const signToken = (user: {
  id: string;
  role?: string | null;
  password: string;
  full_name?: string | null;
}): string =>
  jwt.sign(
    {
      userId: user.id,
      full_name: user.full_name || "",
      role: user.role || "client",
      pwd: passwordFingerprint(user.password),
    },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: TOKEN_TTL_SECONDS },
  );

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
  } catch (error) {
    throw new Error("invalid token");
  }
};
