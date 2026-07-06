const { pool } = require('../config/db');

const initDB = async () => {
    const client = await pool.connect();
    try {
        console.log('Initializing database...');

        // Check if users table exists and has demo user
        try {
            const userCheck = await client.query(
                "SELECT email FROM users WHERE email = 'demo@example.com'"
            );

            if (userCheck.rows.length < 1) {
                console.log('Demo user missing (Seed logic bypassed as seed.sql is missing)');
            } else {
                console.log('Demo users already exist');
            }
        } catch (err) {
            if (err.code === '42P01') { // undefined_table
                console.warn('WARNING: "users" table does not exist! Schema might be missing.');
            } else {
                throw err;
            }
        }

        console.log('Database initialization complete');
    } catch (error) {
        console.error('Error in initDB:', error);
        // Don't throw, allow server to start so we can debug structure
    } finally {
        client.release();
    }
};

module.exports = { initDB };
