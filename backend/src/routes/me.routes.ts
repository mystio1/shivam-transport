import { Router } from 'express';
import * as usersRepo from '../db/repositories/users.repository.js';
import * as groupsRepo from '../db/repositories/groups.repository.js';
import { serializeUser, serializeGroup } from '../services/serializers.js';
import { isValidEmail } from '../services/util.js';
import { HttpError } from '../middleware/errorHandler.js';

export const meRouter = Router();

meRouter.get('/', async (req, res, next) => {
  try {
    const group = await groupsRepo.findById(req.auth!.groupId);
    res.status(200).json({
      user: serializeUser(req.auth!.user, req.auth!.groupCode),
      group: group ? serializeGroup(group) : null,
    });
  } catch (err) { next(err); }
});

// Lets an admin set/update the recovery email used by "Forgot password?" on the login screen.
meRouter.patch('/', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (email && !isValidEmail(email)) throw new HttpError(400, 'Enter a valid email address');
    const user = await usersRepo.updateEmail(req.auth!.user.id, email);
    res.status(200).json({ user: serializeUser(user, req.auth!.groupCode) });
  } catch (err) { next(err); }
});
