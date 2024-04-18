import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscriptionModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/userModel.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError(401, "Invalid channel Id");
  }

  if (!req.user?._id) {
    throw new apiError(401, "Unauthorized user");
  }

  const subscriberId = req.user?._id;

  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId,
  });
  var response;
  try {
    response = isSubscribed
      ? await Subscription.deleteOne({
          channel: channelId,
          subscriber: subscriberId,
        })
      : await Subscription.create({
          channel: channelId,
          subscriber: subscriberId,
        });
  } catch (error) {
    console.log("toggleSubscription error ::", error);
    throw new apiError(
      500,
      error?.message || "Internal server error in toggleSubscription"
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        response,
        isSubscribed === null
          ? "Subscribed successfully"
          : "Unsubscribed successfully"
      )
    );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const channelId = req.params.subscriberId.toString();

  if (!isValidObjectId(channelId)) {
    throw new apiError(400, "Invalid channelId");
  }

  const channels = await Subscription.find({ channel: channelId }).populate(
    "channel"
  );
  if (!channels || channels.length === 0) {
    throw new apiError(404, "No subscribers found for the channel");
  }

  return res
    .status(201)
    .json(new apiResponse(200, channels, "channels  retrieved successfully.."));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberlId = req.params.channelId.toString();

  if (!isValidObjectId(subscriberlId)) {
    throw new apiError(400, "Invalid subscriberlId");
  }

  const subscribers = await Subscription.find({
    channel: subscriberlId,
  }).populate("subscriber");
  if (!subscribers || subscribers.length === 0) {
    throw new apiError(404, "No subscribers found for the channel");
  }

  return res
    .status(201)
    .json(
      new apiResponse(200, subscribers, "subscribers  retrieved successfully..")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
