/**
 * Throttler Middleware - Implements FIFO queueing for concurrent requests.
 * Designed to protect single-server environments (like Render) from resource exhaustion
 * by queueing excess requests instead of rejecting them immediately.
 */

const createThrottler = (concurrencyLimit = 5, maxQueueSize = 50, name = 'Global') => {
  let activeRequests = 0;
  const queue = [];

  return (req, res, next) => {
    let released = false;

    // Helper to release a slot and process the next item in the queue
    const release = () => {
      if (released) return;
      released = true;
      activeRequests--;
      
      if (queue.length > 0) {
        const nextRequest = queue.shift();
        // Defer execution to the next event loop tick to avoid stack overflows
        setImmediate(() => {
          nextRequest();
        });
      }
    };

    // Helper to start processing the request
    const start = () => {
      activeRequests++;
      
      // Ensure slot is released when the response is finished or connection closed
      res.on('finish', release);
      res.on('close', release);
      
      next();
    };

    // Decision logic: Process immediately, Queue, or Reject
    if (activeRequests < concurrencyLimit) {
      start();
    } else if (queue.length < maxQueueSize) {
      // Add to FIFO queue
      queue.push(start);
    } else {
      // If queue is also full, then we must reject
      res.status(429).json({ 
        error: 'Server is currently at maximum capacity. Your request has been dropped. Please try again in a few moments.',
        retryAfter: 5
      });
    }
  };
};

// Optimal limits for a single-server Render environment (usually 0.1-0.5 CPU, 512MB RAM)
module.exports = {
  // Heavy throttler for resource-intensive operations (judging, scraping, forking)
  // Limited to 3 concurrent heavy tasks to prevent CPU/Memory spikes
  heavyThrottler: createThrottler(3, 20, 'HeavyOps'),
  
  // Global throttler for standard API requests
  // Allows 15 concurrent requests with a queue of 50
  globalThrottler: createThrottler(15, 50, 'Global')
};
