// import { apiError } from "../utils/apiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken";
// import { User } from "../models/userModel.js";

// export const verifyJWT = asyncHandler(async (req, _, next) => {
//   try {
//     const token =
//       req.cookies?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//       throw new apiError(401, "Unauthorized request");
//     }

//     const decodedToken = jwt.verify(token, process.env.JWT);

//     const user = await User.findById(decodedToken?._id).select(
//       "-password -refreshToken"
//     );

//     if (!user) {
//       throw new apiError(401, "Invalid Access Token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     throw new apiError(401, error?.message || "Invalid access token");
//   }
// });

import { User } from "../models/userModel.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("bearer", "");
    console.log(token);
    if (!token) {
      throw new apiError(401, "unathprized req");
    }

    const decodedToken = Jwt.verify(token, process.env.JWT);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "invaild access token");
    }
    req.user = user;
  } catch (error) {
    throw new apiError(400, error?.message, "invaild access token");
  }
});