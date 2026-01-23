import { ObjectId } from "mongodb";

export interface CategoryRequest {
  _id: string;
  userId: string;
  userName: string;
  requestedName: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}