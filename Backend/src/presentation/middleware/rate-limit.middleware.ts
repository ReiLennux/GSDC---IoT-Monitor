import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: { status: 429, message: 'Too many requests. Try again in 1 minute' } },
  standardHeaders: true,
  legacyHeaders: false,
});
