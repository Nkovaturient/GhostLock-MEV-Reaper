const express = require('express');
const cors= require('cors');
const app=express();

app.use(cors());

const PORT= process.env.PORT || 4000;

app.listen(PORT, ()=>{
    console.log(`Server Activated on https://localhost:${PORT}`);
});

/**
 * Backend fetches ready intents from GhostLockIntents.
Backend computes clearing price.
Backend signs and sends settleBatch(requestIds, epoch, marketId, clearingPrice) with an executor wallet.

Frontend only:
Displays preview data from backend (/epochs/:epoch/markets/:id/preview).
Lets an allowlisted operator click “Settle” which calls the backend /settle endpoint. The backend then actually hits the chain.
 */