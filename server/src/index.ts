import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import salesmenRoutes from "./routes/salesmen.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";






// create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/salesmen", salesmenRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Geedi Store API",
    status: "Server is running",
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Geedi Store server running on port ${PORT}`);
});
