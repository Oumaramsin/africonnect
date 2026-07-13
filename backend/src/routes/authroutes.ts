import { Router } from "express";
import AuthController from "../controllers/authController";
import AuthMiddleware from "../middlewares/authMiddleware";

const authRouter = Router();
authRouter.post('/register', AuthController.signup);
authRouter.post('/login', AuthController.login);
authRouter.get('/user/:id', AuthMiddleware.authenticate , AuthController.getUserById);
authRouter.patch('/:id', AuthMiddleware.authenticate , AuthController.updateUserById);

export default authRouter;