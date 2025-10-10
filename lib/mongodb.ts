import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
const clientPromise: Promise<MongoClient> = global._mongoClientPromise
  ?? (global._mongoClientPromise = new MongoClient(uri, options).connect());

export default clientPromise;
