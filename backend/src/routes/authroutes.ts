import { Router } from "express";
import AuthController from "../controllers/authController";
import AuthMiddleware from "../middlewares/authMiddleware";

const authRouter = Router();
authRouter.post('/register', AuthController.signup);
authRouter.post('/verify-email', AuthController.verifyEmail);
authRouter.post('/resend-code', AuthController.resendCode);
authRouter.post('/login', AuthController.login);
authRouter.get('/user/:id', AuthMiddleware.authenticate , AuthController.getUserById);
authRouter.patch('/:id', AuthMiddleware.authenticate , AuthController.updateUserById);
authRouter.delete('/:id', AuthMiddleware.authenticate , AuthController.deleteUserById);

export default authRouter;