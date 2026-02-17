import { Request, Response, NextFunction } from 'express';
import * as reservationService from './reservation.service';
import type {
  CreateReservationInput,
  UpdateReservationInput,
  AvailabilityQuery,
  ListReservationsQuery,
  AdminUpdateStatusInput,
} from './reservation.schema';

// ── Customer ────────────────────────────────────────────────────────────────

export async function checkAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurantId = BigInt(req.params.restaurantId!);
    const data = await reservationService.checkAvailability(restaurantId, req.query as unknown as AvailabilityQuery);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.createReservation(req.user!.id, req.body as CreateReservationInput);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMyReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.getMyReservations(
      req.user!.id,
      req.query as unknown as ListReservationsQuery
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getReservationById(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.getReservationById(req.user!.id, BigInt(req.params.id!));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.updateReservation(
      req.user!.id,
      BigInt(req.params.id!),
      req.body as UpdateReservationInput
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function cancelReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.cancelReservation(req.user!.id, BigInt(req.params.id!));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function adminListReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.adminListReservations(
      req.user!.id,
      req.query as unknown as ListReservationsQuery & { date?: string }
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.adminUpdateStatus(
      req.user!.id,
      BigInt(req.params.id!),
      req.body as AdminUpdateStatusInput
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function adminGetCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reservationService.adminGetCustomers(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
