import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

export interface CreateCommandeTraiteurInput {
  client_id?: string;
  traiteur_id: string;
  date_evenement: Date | string;
  nb_personnes: number;
  adresse: string;
  type_evenement?: string;
  notes?: string;
}