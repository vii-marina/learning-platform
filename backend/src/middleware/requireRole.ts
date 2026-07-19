import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/appError";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.isAdmin) {
    next(new AppError(403, "Admin access is required.", "ADMIN_REQUIRED"));
    return;
  }

  next();
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.isSuperAdmin) {
    next(new AppError(403, "Super-admin access is required.", "SUPER_ADMIN_REQUIRED"));
    return;
  }

  next();
}

export function requireTeacherOrAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.isAdmin && req.auth?.role !== "teacher") {
    next(new AppError(403, "Teacher or admin access is required.", "TEACHER_OR_ADMIN_REQUIRED"));
    return;
  }

  next();
}
