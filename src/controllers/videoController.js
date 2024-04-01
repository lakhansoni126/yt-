import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/videoModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { User } from "../models/userModel.js";

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Check if video file exists in request
  if (!req.files || !req.files.videofile || !req.files.videofile[0]) {
    throw new apiError(400, "Video file is required");
  }

  // Get video local path
  const videoLocalPath = req.files.videofile[0].path;

  // Upload video to Cloudinary
  const videoF = await uploadOnCloud(videoLocalPath);

  // Check if video uploaded successfully
  if (!videoF || !videoF.url) {
    throw new apiError(400, "Video upload failed");
  }

  // Upload thumbnail to Cloudinary if available
  let thumbnailF;
  if (req.files.thumbnail) {
    const thumbnailLocalPath = req.files.thumbnail[0].path;
    thumbnailF = await uploadOnCloud(thumbnailLocalPath);
  }

  // Create video object
  const video = await Video.create({
    videofile: videoF.url,
    duration: videoF.duration,
    title,
    description,
    thumbnail: thumbnailF.url,
  });

  // Check if video creation was successful
  if (!video) {
    throw new apiError(500, "Failed to publish video");
  }

  // Retrieve published video from database
  const videoPublished = await Video.findById(video._id);

  // Check if video was found
  if (!videoPublished) {
    throw new apiError(500, "Failed to retrieve published video");
  }

  // Return success response
  return res.status(200).json(new apiResponse(200, videoPublished));
});

export { publishVideo };
