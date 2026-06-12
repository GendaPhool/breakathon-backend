// ============================================================
// server.js
// Entry Point — HTTP server startup
// ============================================================

const env = require("./src/config/env");
const app = require("./src/app");
const prisma = require("./src/config/db");

const PORT = env.PORT;

const startServer = async () => {
  try {
    // Verify database connection before accepting traffic
    await prisma.$connect();
    console.log("✅ Database connected successfully.");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode.`);
      console.log(`📡 API base: http://localhost:${PORT}/api/v1`);
      console.log(`💊 Health:   http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log("🔒 HTTP server closed.");
        await prisma.$disconnect();
        console.log("🔌 Database disconnected.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Unhandled errors — log but don't crash in dev
    process.on("unhandledRejection", (reason, promise) => {
      console.error("⚠️  Unhandled Rejection at:", promise, "reason:", reason);
      if (env.isProd) process.exit(1);
    });

    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
