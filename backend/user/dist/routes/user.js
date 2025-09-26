import express from 'express';
import { loginUser, verifyUser, myProfile, getAllUsers, getUser, updateName } from '../controllers/user.js';
import { isAuth } from '../middleware/isAuth.js';
const router = express.Router();
router.post("/login", loginUser);
router.post("/verify", verifyUser);
router.get("/me", isAuth, myProfile);
router.get("/user/all", isAuth, getAllUsers);
router.get("/user/:id", getUser);
router.post("/update/user", isAuth, updateName);
export default router;
//# sourceMappingURL=user.js.map