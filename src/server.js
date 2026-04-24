import dotenv from "dotenv";
import http from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import salesRoutes from "./routes/sales.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setSocketInstance } from "./utils/socket.js";
import { seedAdmin } from "./seedAdmin.js";
import { migrateLegacyCurrencyToEtb } from "./utils/currencyMigration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  }
});
setSocketInstance(io);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    health: "/api/health"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

io.on("connection", (socket) => {
  // eslint-disable-next-line no-console
  console.log(`Socket client connected: ${socket.id}`);
});

const port = process.env.PORT || 5000;

connectDB()
  .then(migrateLegacyCurrencyToEtb)
  .then(seedAdmin)
  .then(() => {
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on port ${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  });
