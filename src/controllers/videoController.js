import { isValidObjectId } from "mongoose";
import { Video } from "../models/videoModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloud } from "../utils/cloudinary.js";

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const ownerId = req.user.id;

  if (!req.files || !req.files.videofile || !req.files.videofile[0]) {
    throw new apiError(400, "Video file is required");
  }

  const videoLocalPath = req.files.videofile[0].path;

  const videoF = await uploadOnCloud(videoLocalPath);

  if (!videoF || !videoF.url) {
    throw new apiError(400, "Video upload failed");
  }
  let thumbnailF;
  if (req.files.thumbnail) {
    const thumbnailLocalPath = req.files.thumbnail[0].path;
    thumbnailF = await uploadOnCloud(thumbnailLocalPath);
  }

  const video = await Video.create({
    videofile: videoF.url,
    duration: videoF.duration,
    title,
    description,
    thumbnail: thumbnailF.url,
    owner: ownerId,
  });

  if (!video) {
    throw new apiError(500, "Failed to publish video");
  }

  const videoPublished = await Video.findById(video._id);

  if (!videoPublished) {
    throw new apiError(500, "Failed to retrieve published video");
  }

  return res.status(200).json(new apiResponse(200, videoPublished));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const videoQuery = {};

  if (query) {
    videoQuery.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    videoQuery.owner = userId;
  }

  const sortOptions = {};
  if (sortBy && sortType) {
    sortOptions[sortBy] = sortType === "desc" ? -1 : 1;
  }

  const videos = await Video.aggregatePaginate(videoQuery, {
    page: parseInt(page),
    limit: parseInt(limit),
    // sort: sortOptions,
  });

  return res
    .status(201)
    .json(new apiResponse(200, videos, "Videos retrieved successfully.."));
});

const getVideoById = asyncHandler(async (req, res) => {
  const videoid = req.params.videoId.toString();

  console.log(videoid);
  try {
    if (!isValidObjectId(videoid)) {
      return res.status(400).json({
        error: "Invalid Video ID",
      });
    }

    const video = await Video.findById(videoid);

    if (!video) {
      throw new apiError(404, "Video not found");
    }

    res.status(200).json(new apiResponse(200, "Video retrieved:", video));
  } catch (error) {
    console.error("Error while retrieving Video:", error);
    res.status(500).json(new apiError(500, "Internal Server Error"));
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId.toString();

  if (!isValidObjectId(videoId)) {
    return res.status(400).json({
      error: "Invalid video ID",
    });
  }

  try {
    const userId = req.user.id;

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
      throw new apiError(404, "Video not found");
    }

    if (video.owner !== userId) {
      return res
        .status(403)
        .json(
          new apiResponse(
            403,
            "Unauthorized You are not the owner of this Video!"
          )
        );
    }

    return res
      .status(200)
      .json(new apiResponse(200, {}, "Video deleted successfully"));
  } catch (error) {
    console.error("Error deleting Video:", error);
    return res.status(500).json(new apiError(500, "Internal Server Error"));
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId.toString();
  const userId = req.user.id;
  const { title, description, thumbnail } = req.body;
  console.log(req.params);
  try {
    if (!isValidObjectId(videoId)) {
      return res.status(400).json({
        error: "Invalid Video ID",
      });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new apiError(404, "Video not found");
    }

    if (video.owner.toString() !== userId) {
      return res
        .status(403)
        .json(
          new apiError(
            403,
            "Unauthorized: You are not the owner of this video!"
          )
        );
    }

    const thumbnailUrl = await uploadOnCloud(thumbnail);

    video.title = title;
    video.description = description;
    video.thumbnail = thumbnailUrl;

    await video.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new apiResponse(200, {}, "Video details updated successfully"));
  } catch (error) {
    console.error("Error updating Video:", error);
    return res.status(500).json(new apiError(500, "Internal Server Error"));
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId.toString();

  try {
    const video = await Video.findByIdAndUpdate(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    video.ispublished = !video.ispublished;

    await video.save();

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          `Publish status toggled successfully. New status: ${video.isPublished ? "Published" : "Unpublished"}`,
          video
        )
      );
  } catch (error) {
    console.error("Error while toggling Video publish status:", error);
    res.status(500).json(new apiError(500, "Internal Server Error"));
  }
});
export {
  publishVideo,
  getAllVideos,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
};
