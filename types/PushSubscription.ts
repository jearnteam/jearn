// types/PushSubscription.ts
import mongoose from "mongoose";

const PushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  subscription: { type: Object, required: true },
});

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);