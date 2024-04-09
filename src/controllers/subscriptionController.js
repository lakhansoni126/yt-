import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/userModel.js";
import { Subscription } from "../models/subscriptionModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log(channelId);
  if (!channelId) {
    throw new apiError(400, "Not found channel id");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new apiError(404, "Channel does not exits");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new apiError(404, "User not founded");
  }

  const subscriber = await Subscription.find({
    subscriber: isValidObjectId(req.user?._id),
    channel: isValidObjectId(channelId),
  });

  let toggle;
  if (!subscriber) {
    toggle = await Subscription.create({
      subscriber: req?.user.id,
      channel: channelId,
    });
    if (!toggle) {
      throw new apiError(400, "Something went wrong");
    }
  } else {
    toggle = await Subscription.findByIdAndDelete(subscriber._id);
  }

  res
    .status(200)
    .json(new apiResponse(200, toggle, "Successfully toggled the state"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
