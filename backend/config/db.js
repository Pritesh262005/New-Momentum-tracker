const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to backend/.env (Atlas: mongodb+srv://... or local: mongodb://localhost:27017/...)'
    );
  }

  const retries = Number(process.env.MONGODB_CONNECT_RETRIES ?? 15);
  const baseDelayMs = Number(process.env.MONGODB_CONNECT_RETRY_DELAY_MS ?? 500);
  const maxDelayMs = Number(process.env.MONGODB_CONNECT_RETRY_MAX_DELAY_MS ?? 5000);

  const shouldRetryForever = retries <= 0;
  let attempt = 0;
  let lastError;
  while (shouldRetryForever || attempt < retries) {
    attempt++;
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      lastError = error;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);

      console.error(`❌ MongoDB Connection Error (attempt ${attempt}/${retries}): ${error.message}`);
      if (
        typeof error.message === 'string' &&
        error.message.includes('tlsv1 alert internal error') &&
        process.platform === 'win32'
      ) {
        console.error(
          'Hint: This Atlas TLS error is commonly seen on Windows with newer Node.js versions. Try running the backend on Node.js 20 LTS.'
        );
      }
      if (attempt < retries) {
        await sleep(delay + jitter);
      }
    }
  }

  throw lastError;
};

module.exports = connectDB;
