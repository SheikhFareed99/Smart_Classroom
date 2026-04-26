import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined in .env");
    }
    
    // Add the options object as the second argument here!
    const conn = await mongoose.connect(mongoURI, {
      family: 4
    });
    
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err: any) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;