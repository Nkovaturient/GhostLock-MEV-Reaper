/**
 * Reveal status is set from the reveal transaction receipt in
 * useIntentLivenessFollowup. An HTTP eth_getLogs watch against a public
 * RPC retries on 429 and is what flooded the browser during the lock.
 */
export function useIntentDecryptedWatch() {}
