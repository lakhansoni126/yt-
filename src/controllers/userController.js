import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/userModel.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

// const generateAccessAndRefereshTokens = async (userId) => {
//   try {
//     const user = await User.findById(userId);
//     const accessToken = user.generateAccessToken();
//     const refreshToken = user.generateRefreshToken();

//     user.refreshToken = refreshToken;
//     await user.save({ validateBeforeSave: false });

//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new apiError(
//       500,
//       "Something went wrong while generating referesh and access token"
//     );
//   }
// };
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
    .json(new apiError(200, {}, "user logged out"));
});

export { registerUser, loginUser, logoutUser };
