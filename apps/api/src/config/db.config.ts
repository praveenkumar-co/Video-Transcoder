  import mongoose from "mongoose";
  import { env } from "../env";

  export const connectDB = async () => {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log("MongoDB Atlas connected");
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      process.exit(1);
    }
  };