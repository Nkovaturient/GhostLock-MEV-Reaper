import { useEffect, useState } from 'react';

export interface PriceData {
    token: string;
    price: bigint;
    confidence: bigint;
    timestamp: number;
    source: 'pyth' | 'chainlink';
}

export function usePriceFeeds(tokenIn: string, tokenOut: string) {
    const [priceIn, setPriceIn] = useState<PriceData | null>(null);
    const [priceOut, setPriceOut] = useState<PriceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        // WebSocket connection
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'subscribe',
                tokens: [tokenIn, tokenOut]
            }));
        };
        
        ws.onmessage = (event) => {
            const data: PriceData = JSON.parse(event.data);
            
            if (data.token === tokenIn) {
                setPriceIn(data);
            } else if (data.token === tokenOut) {
                setPriceOut(data);
            }
            
            setIsLoading(false);
        };
        
        ws.onerror = () => {
            setError(new Error('WebSocket error'));
            setIsLoading(false);
        };
        
        return () => {
            ws.close();
        };
    }, [tokenIn, tokenOut]);
    
    // Calculate exchange rate
    const exchangeRate = priceIn && priceOut
        ? Number(priceIn.price) / Number(priceOut.price)
        : null;
    
    // Check staleness
    const isStale = priceIn && priceOut
        ? Date.now() - Math.min(priceIn.timestamp, priceOut.timestamp) > 60000
        : false;
    
    return {
        priceIn,
        priceOut,
        exchangeRate,
        isStale,
        isLoading,
        error
    };
}