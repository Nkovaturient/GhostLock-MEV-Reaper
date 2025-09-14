// queue.js-- This pushes ready request IDs to Redis list ghostlock:readyRequests. solver fetches from the queue
async function enqueueRequestId(redisClient, requestId) {
  // Use a stream list for FIFO processing
  await redisClient.rpush("ghostlock:readyRequests", requestId.toString());
}

async function dequeueRequestId(redisClient) {
  const r = await redisClient.lpop("ghostlock:readyRequests");
  return r;
}

module.exports = { enqueueRequestId, dequeueRequestId }