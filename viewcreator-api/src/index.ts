import dotenv from 'dotenv';
// Load environment variables immediately before importing other modules.
// Tries package-level .env first, then falls back to monorepo root .env.
dotenv.config();
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import templateRoutes from './routes/templates.js';
import generationRoutes from './routes/generations.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import analyzeRoutes from './routes/analyze.js';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
// Use a large payload limit (e.g., 10mb) to support base64 encoded reference images
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(clerkMiddleware());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use(templateRoutes);
app.use(generationRoutes);
app.use(paymentRoutes);
app.use(adminRoutes);
app.use(analyzeRoutes);

// Start Server
app.listen(port, () => {
  console.log(`🚀 ViewCreator API is running on http://localhost:${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 Generate endpoint: http://localhost:${port}/api/generate`);
});
