// lib/mongodbAdapter.ts
import { MongoClient } from "mongodb";

declare global {
  var _authMongoClient: MongoClient | undefined;
  var _authMongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI!;
const options = {};

if (!global._authMongoClient) {
  const client = new MongoClient(uri, options);
  global._authMongoClient = client;
  global._authMongoClientPromise = client.connect();
}

const clientPromise = global._authMongoClientPromise!;

export default clientPromise;