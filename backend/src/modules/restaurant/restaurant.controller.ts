import { Request, Response, NextFunction } from 'express';
import * as restaurantService from './restaurant.service';
import type { CreateRestaurantInput, UpdateRestaurantInput } from './restaurant.schema';

export async function listRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await restaurantService.listRestaurants();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await restaurantService.getRestaurantById(BigInt(req.params.id!));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAdminRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await restaurantService.getAdminRestaurant(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAdminRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await restaurantService.createAdminRestaurant(req.user!.id, req.body as CreateRestaurantInput);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await restaurantService.updateAdminRestaurant(req.user!.id, req.body as UpdateRestaurantInput);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
