import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: String,
});

export default models.User || model("User", UserSchema);
