import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class UserController {
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.create({ data: req.body });
      res.status(201).json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) throw new AppError(404, `User not found: ${req.params.id}`);
      res.json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
      res.json({ status: 'ok', data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
