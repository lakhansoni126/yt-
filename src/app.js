import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_O,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes
import userRouter from "./routes/userRoutes.js";

import videoRouter from "./routes/videoRoute.js";

//routes declaration
app.use("/api/users", userRouter);
app.use("/api/video", videoRouter);

export { app };
