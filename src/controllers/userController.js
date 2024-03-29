import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/userModel.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, password, username } = req.body;

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "all fields required");
  }

  const exitingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (exitingUser) {
    throw new apiError(409, "username or email exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverimgLocalPath = req.files?.coverimg[0]?.path;
  let coverimgLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverimg && req.files.coverimg.lenght > 0)
  ) {
    coverimgLocalPath = req.files.coverimg[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloud(avatarLocalPath);
  const coverimg = await uploadOnCloud(coverimgLocalPath);

  if (!avatar) {
    throw new apiError(400, "avatar required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimg: coverimg?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const userCreated = await User.findById(user._id).select(
    "-password -refrshtoken"
  );

  if (!userCreated) {
    throw new apiError(500, "server error");
  }
  return res.status(201).json(new apiResponse(200, userCreated));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!username && !email) {
    throw new apiError(400, "username or email required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });

  if (!user) {
    throw new apiError(404, "user not found");
  }
  const isPasswordVaild = await user.isPasswordCorrect(password);

  if (!isPasswordVaild) {
    throw new apiError(401, "invild credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in "
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const clientRefreshToken = req.cookies.refreshToken || req.body.re;

  if (!clientRefreshToken) {
    throw new apiError(401, "unauthorized");
  }

  try {
    const decodedToken = jwt.verify(
      clientRefreshToken,
      process.env.REFRESH_JWT
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "invaild refresh token");
    }

    if (clientRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshtoken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message);
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordCorrect) {
    throw new apiError(400, "invaild current password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new apiResponse(200, {}, "password changed"));
});

const getcUser = asyncHandler(async (req, res) => {
  return res.status(200).json(200, req.user, "current user fetched");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new apiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(new apiResponse(200, user, "account updated"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarlPath = req.file?.path;
  if (!avatarlPath) {
    throw new apiError(400, "please select an image");
  }
  const avatar = await uploadOnCloud(avatarlPath);
  if (!avatar.url) {
    throw new apiError(400, "uploading error");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  );
  return res.status(200).json(new apiResponse(200, user, "avatar updated"));
});

const updateCover = asyncHandler(async (req, res) => {
  const coverlPath = req.file?.path;
  if (!coverlPath) {
    throw new apiError(400, "please select an image");
  }
  const coverimg = await uploadOnCloud(coverlPath);
  if (!coverimg.url) {
    throw new apiError(400, "uploading error");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverimg: coverimg.url } },
    { new: true }
  );
  return res.status(200).json(new apiResponse(200, user, "cover updated"));
});

const getChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new apiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channelId",
        as: "Subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "SubscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$Subscribers",
        },
        channelsSubscribed: {
          $size: "$SubscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$Subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribed: 1,
        avatar: 1,
        coverimg: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apiError(404, "channel does not exists ");
  }
  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "channel profile fetched"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchhistory",
        foreignField: "_id",
        as: "watchhistory",

        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",

              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, user[0].watchhistory, "watch history fetcched"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getcUser,
  updateAccountDetails,
  updateAvatar,
  updateCover,
  getChannelProfile,
  getWatchHistory,
};
