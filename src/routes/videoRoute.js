import { Router } from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/multerMiddleware.js";
import { publishVideo } from "../controllers/videoController.js";

const router = Router();
router.use(verifyJWT);

router.route("/publishvideo").post(
  upload.fields([
    {
      name: "videofile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishVideo
);

export default router;
