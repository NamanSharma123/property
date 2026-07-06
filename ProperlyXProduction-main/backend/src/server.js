// Backend update trigger
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const config = require('./config');
const { initDB } = require('./db/init');
const {
  authRoutes,
  propertyRoutes,
  transactionRoutes,
  tenantRoutes,
  expenseRoutes,
  categoryRoutes,
  notificationRoutes,
  ocrRoutes,

} = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();

// Connect to PostgreSQL and initialize
connectDB().then(async () => {
  try {
    await initDB();
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
});

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}



// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL (Supabase)',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ocr', ocrRoutes);


// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🏠 Properly Backend Server                   ║
║                                                ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}
║   Port: ${PORT.toString().padEnd(35)}
║   API: http://localhost:${PORT}/api              
║   Database: PostgreSQL (Supabase)               ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = app;
