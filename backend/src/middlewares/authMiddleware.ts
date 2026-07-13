import { Response, Request, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AuthenticatedRequest } from "../utils/types";

class AuthMiddleware {
  static authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return res.status(401).json({ message: "no token provided" });
    }
    try {
      const decoded = verifyToken(token);
      (req as AuthenticatedRequest).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "invalid token" });
    }
  };
  static isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user; 
  if (!user || user.role !== "Admin") {
    return res.status(403).json({ message: "Accès refusé. Réservé aux administrateurs." });
  }
  next(); 
  };

}
export default AuthMiddleware;
