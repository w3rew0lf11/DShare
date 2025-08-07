import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import uploadRoute from "./routes/uploadRoute.js";
import fileRoute from "./routes/fileRoute.js";
import popularityRoute from "./routes/popularityRoute.js"; 
import activityRoute from "./routes/activityRoute.js"; 
import virusScanRoute from './routes/virusScanRoute.js'

const app = express();
const __dirname = path.resolve();

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, "/Frontend/dist")));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", 
    credentials: true,
  })
);
app.use(cookieParser());

// Routes
app.use("/api/users", userRoute);
app.use("/api/messages", messageRoute);
app.use("/api", uploadRoute);
app.use("/api", fileRoute);
app.use('/api/data', virusScanRoute)

app.use("/api/popularity", popularityRoute); 
app.use("/api/activity", activityRoute); 
// Catch-all route to serve React frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "Frontend", "dist", "index.html"));
});

export default app;