import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crosshair, AlertTriangle, Shield, TrendingDown, Play, Pause, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../src/components/ui/Card'
import Button from '../../../../src/components/ui/Button'
import { Badge } from '../../../../src/components/ui/Badge'
import { cn } from '../../../../src/lib/utils'

interface AttackConfig {
  sophistication: 'naive' | 'heuristic' | 'advanced'
  capitalLimit: number
  timingStrategy: 'immediate' | 'delayed' | 'optimal'
  targetType: 'sandwich' | 'frontrun' | 'arbitrage'
}

interface AttackResult {
  id: string
  type: string
  status: 'failed' | 'partial' | 'blocked'
  attemptedProfit: number
  actualProfit: number
  preventionReason: string
  timestamp: number
}

export default function AttackerLabPage() {
  const [isSimulating, setIsSimulating] = useState(false)
  const [attackConfig, setAttackConfig] = useState<AttackConfig>({
    sophistication: 'heuristic',
    capitalLimit: 10000,
    timingStrategy: 'optimal',
    targetType: 'sandwich'
  })

  const [attackResults, setAttackResults] = useState<AttackResult[]>([
    {
      id: 'ATK-001',
      type: 'Sandwich Attack',
      status: 'failed',
      attemptedProfit: 250.50,
      actualProfit: 0,
      preventionReason: 'Intent encrypted until execution block',
      timestamp: Date.now() - 300000
    },
    {
      id: 'ATK-002',
      type: 'Front-running',
      status: 'blocked',
      attemptedProfit: 180.25,
      actualProfit: 0,
      preventionReason: 'VRF-based ordering prevents priority manipulation',
      timestamp: Date.now() - 600000
    },
    {
      id: 'ATK-003',
      type: 'Arbitrage',
      status: 'partial',
      attemptedProfit: 95.75,
      actualProfit: 12.30,
      preventionReason: 'Batch settlement reduces arbitrage window',
      timestamp: Date.now() - 900000
    }
  ])

  const startSimulation = () => {
    setIsSimulating(true)
    
    // Simulate attack attempts
    const interval = setInterval(() => {
      const attackTypes = ['Sandwich Attack', 'Front-running', 'Arbitrage', 'MEV Extraction']
      const statuses: AttackResult['status'][] = ['failed', 'blocked', 'partial']
      const preventionReasons = [
        'Intent encrypted until execution block',
        'VRF-based ordering prevents manipulation',
        'Batch settlement eliminates timing advantage',
        'Uniform pricing removes profit opportunity',
        'Dummy intents obscure real trading patterns'
      ]

      const newAttack: AttackResult = {
        id: `ATK-${String(attackResults.length + 1).padStart(3, '0')}`,
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        attemptedProfit: Math.random() * 500 + 50,
        actualProfit: Math.random() * 20,
        preventionReason: preventionReasons[Math.floor(Math.random() * preventionReasons.length)],
        timestamp: Date.now()
      }

      setAttackResults(prev => [newAttack, ...prev.slice(0, 9)])
    }, 3000)

    // Stop simulation after 30 seconds
    setTimeout(() => {
      setIsSimulating(false)
      clearInterval(interval)
    }, 30000)
  }

  const stopSimulation = () => {
    setIsSimulating(false)
  }

  const resetResults = () => {
    setAttackResults([])
  }

  const getStatusColor = (status: AttackResult['status']) => {
    switch (status) {
      case 'failed': return 'attack-failed'
      case 'blocked': return 'attack-failed'
      case 'partial': return 'attack-partial'
      default: return 'attack-successful'
    }
  }

  const totalAttemptedProfit = attackResults.reduce((sum, result) => sum + result.attemptedProfit, 0)
  const totalActualProfit = attackResults.reduce((sum, result) => sum + result.actualProfit, 0)
  const preventionRate = totalAttemptedProfit > 0 ? ((totalAttemptedProfit - totalActualProfit) / totalAttemptedProfit) * 100 : 0

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Crosshair className="w-8 h-8 text-red-400" />
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                Attacker Laboratory
              </h1>
              <p className="text-ghost-300 text-lg">
                Simulate MEV attacks and observe how GhostLock's protection mechanisms prevent extraction
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400">
              Simulation Environment - No real funds at risk
            </span>
          </div>
        </motion.div>

        {/* Attack Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Attack Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-ghost-300">Sophistication</label>
                <select
                  value={attackConfig.sophistication}
                  onChange={(e) => setAttackConfig(prev => ({ ...prev, sophistication: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white"
                >
                  <option value="naive">Naive</option>
                  <option value="heuristic">Heuristic</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ghost-300">Capital Limit</label>
                <input
                  type="number"
                  value={attackConfig.capitalLimit}
                  onChange={(e) => setAttackConfig(prev => ({ ...prev, capitalLimit: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ghost-300">Timing Strategy</label>
                <select
                  value={attackConfig.timingStrategy}
                  onChange={(e) => setAttackConfig(prev => ({ ...prev, timingStrategy: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white"
                >
                  <option value="immediate">Immediate</option>
                  <option value="delayed">Delayed</option>
                  <option value="optimal">Optimal</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ghost-300">Attack Type</label>
                <select
                  value={attackConfig.targetType}
                  onChange={(e) => setAttackConfig(prev => ({ ...prev, targetType: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-ghost-800 border border-ghost-600 rounded-lg text-white"
                >
                  <option value="sandwich">Sandwich</option>
                  <option value="frontrun">Front-running</option>
                  <option value="arbitrage">Arbitrage</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={isSimulating ? stopSimulation : startSimulation}
                variant={isSimulating ? 'danger' : 'primary'}
                className="flex items-center space-x-2"
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Stop Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Attack Simulation</span>
                  </>
                )}
              </Button>

              <Button
                onClick={resetResults}
                variant="ghost"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Results</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Protection Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                ${totalAttemptedProfit.toFixed(2)}
              </div>
              <div className="text-sm text-ghost-300">Attempted MEV</div>
              <div className="text-xs text-ghost-400 mt-1">
                Total profit attempts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                ${totalActualProfit.toFixed(2)}
              </div>
              <div className="text-sm text-ghost-300">Actual MEV</div>
              <div className="text-xs text-ghost-400 mt-1">
                Successfully extracted
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {preventionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-ghost-300">Prevention Rate</div>
              <div className="text-xs text-ghost-400 mt-1">
                MEV successfully blocked
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attack Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Attack Simulation Results</span>
              {isSimulating && (
                <Badge variant="warning" className="animate-pulse">
                  Simulating...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attackResults.length === 0 ? (
              <div className="text-center py-8">
                <Crosshair className="w-8 h-8 text-ghost-600 mx-auto mb-4" />
                <p className="text-ghost-400">No attack simulations yet</p>
                <p className="text-ghost-500 text-sm">Start a simulation to see results</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ghost-700">
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Attack ID</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Attempted</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Actual</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Prevention Reason</th>
                      <th className="text-left py-3 px-4 text-ghost-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attackResults.map((result, index) => (
                      <motion.tr
                        key={result.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-b border-ghost-800 hover:bg-ghost-800/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className="font-mono text-primary-400">{result.id}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium">{result.type}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={
                            result.status === 'failed' || result.status === 'blocked' ? 'success' : 'warning'
                          }>
                            {result.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-red-400">
                            ${result.attemptedProfit.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={cn(
                            'font-mono',
                            result.actualProfit === 0 ? 'text-green-400' : 'text-yellow-400'
                          )}>
                            ${result.actualProfit.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-ghost-300 text-sm">
                            {result.preventionReason}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-ghost-400 text-sm">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Protection Mechanisms */}
        <Card>
          <CardHeader>
            <CardTitle>Active Protection Mechanisms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  name: 'Blocklock Encryption',
                  description: 'Intents hidden until execution',
                  effectiveness: '99.8%',
                  icon: Lock
                },
                {
                  name: 'VRF Ordering',
                  description: 'Fair transaction sequencing',
                  effectiveness: '100%',
                  icon: Shield
                },
                {
                  name: 'Batch Settlement',
                  description: 'Uniform price clearing',
                  effectiveness: '97.2%',
                  icon: TrendingUp
                },
                {
                  name: 'Privacy Obfuscation',
                  description: 'Dummy intents and padding',
                  effectiveness: '94.5%',
                  icon: Eye
                }
              ].map((mechanism, index) => (
                <motion.div
                  key={mechanism.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <mechanism.icon className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-white">{mechanism.name}</span>
                  </div>
                  <p className="text-sm text-ghost-400 mb-2">{mechanism.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ghost-500">Effectiveness</span>
                    <span className="text-sm font-bold text-green-400">{mechanism.effectiveness}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}