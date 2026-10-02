import { Navigate } from 'react-router-dom'

/** Legacy route — HolmeSwap is the supported intent submission UI. */
export default function TradePage() {
  return <Navigate to="/holmeswap" replace />
}
