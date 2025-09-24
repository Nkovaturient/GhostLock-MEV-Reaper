import { Shield, Eye, EyeOff, Lock } from 'lucide-react'
import { cn } from '../../../../src/lib/utils'

interface PrivacyConfig {
  enablePadding: boolean
  enableDummyIntents: boolean
  paddingSize: number
  dummyIntentCount: number
  dummyIntentRatio: number
}

interface PrivacyHealthIndicatorProps {
  config: PrivacyConfig
  className?: string
}

export default function PrivacyHealthIndicator({ config, className }: PrivacyHealthIndicatorProps) {
  // Calculate privacy score based on configuration
  const calculatePrivacyScore = () => {
    let score = 0
    
    // Base score for encryption (always enabled)
    score += 40
    
    // Padding contribution
    if (config.enablePadding) {
      score += Math.min(20, config.paddingSize / 256 * 20)
    }
    
    // Dummy intents contribution
    if (config.enableDummyIntents) {
      score += Math.min(25, config.dummyIntentCount * 5)
      score += Math.min(15, config.dummyIntentRatio * 60)
    }
    
    return Math.min(100, Math.round(score))
  }

  const privacyScore = calculatePrivacyScore()
  
  const getHealthLevel = () => {
    if (privacyScore >= 90) return { level: 'Excellent', class: 'privacy-excellent' }
    if (privacyScore >= 75) return { level: 'Good', class: 'privacy-good' }
    if (privacyScore >= 60) return { level: 'Fair', class: 'privacy-fair' }
    return { level: 'Poor', class: 'privacy-poor' }
  }

  const health = getHealthLevel()

  return (
    <div className={cn('privacy-health', health.class, className)}>
      <div className="flex items-center space-x-2">
        <Shield className="w-5 h-5" />
        <div>
          <div className="font-medium">Privacy Health: {health.level}</div>
          <div className="text-xs opacity-80">Score: {privacyScore}/100</div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <Lock className="w-3 h-3" />
          <span>Encryption</span>
        </div>
        
        {config.enablePadding && (
          <div className="flex items-center space-x-1">
            <EyeOff className="w-3 h-3" />
            <span>Padding</span>
          </div>
        )}
        
        {config.enableDummyIntents && (
          <div className="flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>Dummies</span>
          </div>
        )}
      </div>
    </div>
  )
}