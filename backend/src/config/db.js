const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL even in development
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
  console.log('PostgreSQL Connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  }

  return res;
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} - Pool client
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = release;
    return release();
  };

  return client;
};

/**
 * Initialize the database connection
 * @returns {Promise} - Connection result
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`PostgreSQL Connected at: ${result.rows[0].now}`);
    return pool;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Close all connections in the pool
 */
const closePool = async () => {
  await pool.end();
  console.log('PostgreSQL connection pool closed');
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  query,
  getClient,
  connectDB,
  closePool,
};
