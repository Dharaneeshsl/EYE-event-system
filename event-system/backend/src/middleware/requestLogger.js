import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;
  const ip = req.ip;

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1e6);
    logger.info('request', {
      method,
      url: originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip
    });
  });

  next();
};

export default requestLogger;




