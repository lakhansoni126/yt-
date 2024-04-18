import mongoose, { Schema, SchemaTypes } from "mongoose";
const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: SchemaTypes.ObjectId,
      ref: "user",
    },
    channel: {
      type: SchemaTypes.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("subscription", subscriptionSchema);
