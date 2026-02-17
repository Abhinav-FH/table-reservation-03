import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeAdmin } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createTableSchema, updateTableSchema } from './table.schema';
import { getTables, createTable, updateTable, deleteTable, getFloorPlan } from './table.controller';

const router = Router();

// All table routes are admin-only
router.use(authenticate, authorizeAdmin);

router.get('/', getTables);
router.post('/', validate(createTableSchema), createTable);
router.patch('/:id', validate(updateTableSchema), updateTable);
router.delete('/:id', deleteTable);
router.get('/floor-plan', getFloorPlan);

export default router;
