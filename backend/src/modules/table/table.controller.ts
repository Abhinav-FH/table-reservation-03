import { Request, Response, NextFunction } from 'express';
import * as tableService from './table.service';
import type { CreateTableInput, UpdateTableInput } from './table.schema';

export async function getTables(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tableService.getTables(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createTable(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tableService.createTable(req.user!.id, req.body as CreateTableInput);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateTable(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tableService.updateTable(req.user!.id, BigInt(req.params.id!), req.body as UpdateTableInput);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteTable(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tableService.deleteTable(req.user!.id, BigInt(req.params.id!));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0]!;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const data = await tableService.getFloorPlan(req.user!.id, date);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
