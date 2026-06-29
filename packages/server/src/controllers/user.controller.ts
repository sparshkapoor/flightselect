import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { DbUser } from '../types/db';

export class UserController {
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, displayName, preferredCurrency, homeAirport } = req.body as Partial<DbUser>;
      const user = await queryOne<DbUser>(
        `INSERT INTO "User" (id, email, "displayName", "preferredCurrency", "homeAirport")
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [crypto.randomUUID(), email, displayName ?? null, preferredCurrency ?? 'USD', homeAirport ?? null]
      );
      res.status(201).json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await queryOne<DbUser>('SELECT * FROM "User" WHERE id = $1', [req.params.id]);
      if (!user) throw new AppError(404, `User not found: ${req.params.id}`);
      res.json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { displayName, preferredCurrency, homeAirport } = req.body as Partial<DbUser>;
      const user = await queryOne<DbUser>(
        `UPDATE "User" SET
          "displayName"       = COALESCE($1, "displayName"),
          "preferredCurrency" = COALESCE($2, "preferredCurrency"),
          "homeAirport"       = COALESCE($3, "homeAirport")
         WHERE id = $4 RETURNING *`,
        [displayName ?? null, preferredCurrency ?? null, homeAirport ?? null, req.params.id]
      );
      if (!user) throw new AppError(404, `User not found: ${req.params.id}`);
      res.json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await query('DELETE FROM "User" WHERE id = $1', [req.params.id]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
