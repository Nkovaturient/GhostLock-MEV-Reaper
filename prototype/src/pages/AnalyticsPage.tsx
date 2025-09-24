import { motion } from 'framer-motion'
import { Shield, Activity, TrendingUp, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../src/components/ui/Card'
import MEVAnalytics from '../../../../src/components/analytics/MEVAnalytics'
import { Badge } from '../../../../src/components/ui/Badge'

export default function AnalyticsPage() {
  // Mock privacy metrics for demonstration
  const privacyMetrics = [
    {
      title: 'Intent Obfuscation',
      value: '94.8%',
      description: 'Percentage of intents with privacy protection',
      icon: Eye,
      color: 'text-blue-400'
    },
    {
      title: 'Dummy Intent Ratio',
      value: '28.3%',
      description: 'Ratio of dummy to real intents',
      icon: Shield,
      color: 'text-purple-400'
    },
    {
      title: 'Padding Effectiveness',
      value: '99.1%',
      description: 'Size-based analysis prevention',
      icon: Activity,
      color: 'text-green-400'
    },
    {
      title: 'MEV Attack Success',
      value: '0.12%',
      description: 'Successful MEV extraction rate',
      icon: TrendingUp,
      color: 'text-red-400'
    }
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Protection Analytics
          </h1>
          <p className="text-ghost-300 text-lg">
            Real-time insights into MEV protection effectiveness and privacy metrics
          </p>
        </motion.div>

        {/* Privacy Protection Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {privacyMetrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover glow>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-primary-500/20 rounded-lg">
                      <metric.icon className={`w-5 h-5 ${metric.color}`} />
                    </div>
                    <Badge variant="success">Live</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">{metric.value}</h3>
                    <p className="text-sm font-medium text-ghost-300">{metric.title}</p>
                    <p className="text-xs text-ghost-400">{metric.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Protection Effectiveness */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>MEV Protection Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">99.88%</div>
                <div className="text-sm text-ghost-300">Attack Prevention Rate</div>
                <div className="text-xs text-ghost-400 mt-1">
                  Successful blocks of MEV attempts
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">$2.4M</div>
                <div className="text-sm text-ghost-300">Value Protected</div>
                <div className="text-xs text-ghost-400 mt-1">
                  Total trading volume shielded
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">0.08%</div>
                <div className="text-sm text-ghost-300">Average Slippage</div>
                <div className="text-xs text-ghost-400 mt-1">
                  Reduced from 2.3% industry average
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MEV Analytics Component */}
        <MEVAnalytics />
      </div>
    </div>
  )
}