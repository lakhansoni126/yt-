import { Router } from "express";
import {
  changePassword,
  getChannelProfile,
  getWatchHistory,
  getcUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCover,
} from "../controllers/userController.js";
import { upload } from "../middlewares/multerMiddleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverimg",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refreshtoken").post(refreshAccessToken);

router.route("/changepassword").post(verifyJWT, changePassword);

router.route("/currentuser").post(verifyJWT, getcUser);

router.route("/updatedetails").patch(verifyJWT, updateAccountDetails);

router
  .route("/updateavatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);

router
  .route("/updatecover")
  .patch(verifyJWT, upload.single("coverimg"), updateCover);

router.route("/c/:username").get(verifyJWT, getChannelProfile);

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
