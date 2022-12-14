import { Router } from 'express'
const router = Router()
import { login, logout, refreshToken } from '../controllers/auth/auth.controller.js'
import { validateLogin } from '../controllers/auth/auth.validator.js'
import makeExpressCallback from '../middleware/express-callback.js'
import makeValidatorCallback from '../middleware/validator-callback.js'
/* GET programming languages. */

router.post('/login', makeValidatorCallback(validateLogin), makeExpressCallback(login))
router.post('/refreshtoken', makeExpressCallback(refreshToken))
router.post('/logout', makeExpressCallback(logout))

export default router