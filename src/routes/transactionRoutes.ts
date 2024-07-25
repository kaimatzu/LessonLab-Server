import { Router } from 'express';
import transactionController from '../controllers/transactionController';

const router = Router();

router.post('/purchase_tokens', transactionController.createTokenPurchaseCheckoutSession)
router.get('/checkout_status/:sessionId', transactionController.getTokenPurchaseCheckoutSessionStatus)

export default router;