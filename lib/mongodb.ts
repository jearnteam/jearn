// lib/mongodb.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI");

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const options = {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  retryReads: true,
};

if (!global._mongoClient) {
  const client = new MongoClient(uri, options);
  global._mongoClient = client;
  global._mongoClientPromise = client.connect();
}

export default global._mongoClientPromise!;
