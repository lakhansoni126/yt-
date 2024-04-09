import { User } from "../models/userModel.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("bearer", "");

    if (!token) {
      throw new apiError(401, "unathprized req");
    }

    const decodedToken = jwt.verify(token, process.env.JWT);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "invaild access token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new apiError(400, error?.message, "invaild access token");
  }
});
