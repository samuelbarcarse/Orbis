import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI);
let db;

export async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db(process.env.DB_NAME);
  console.log(`Connected to MongoDB — database: "${process.env.DB_NAME}"`);
  return db;
}

export function getCollection(name) {
  if (!db) throw new Error('DB not connected. Call connectDB() first.');
  return db.collection(name);
}
