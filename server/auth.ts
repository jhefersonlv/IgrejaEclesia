import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";

export function requireModulo(moduloChave: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    const ok = await storage.checkUserHasAccess(user.id, moduloChave);
    if (!ok) return res.status(403).json({ message: `Acesso negado ao módulo "${moduloChave}".` });
    next();
  };
}
