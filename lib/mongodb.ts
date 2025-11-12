// lib/mongodb.ts
import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options: MongoClientOptions = {
  // Tip: enable connection pooling and retries
  maxPoolSize: 10, // ensures we don’t build new clients for each request
  retryWrites: true,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Allow global caching in dev to avoid creating multiple connections during HMR
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error("❌ Please add MONGODB_URI to your .env.local");
}

if (process.env.NODE_ENV === "development") {
  // In dev, use global variable to persist client across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().then((client) => {
      console.log("✅ New MongoDB connection established (development).");
      return client;
    });
  } else {
    console.log("♻️ Reusing MongoDB client from global cache (development).");
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client once, re-used by the server runtime
  client = new MongoClient(uri, options);
  clientPromise = client.connect().then((client) => {
    console.log("✅ MongoDB connected (production).");
    return client;
  });
}

export default clientPromise;
