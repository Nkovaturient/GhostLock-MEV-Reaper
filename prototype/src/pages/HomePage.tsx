import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Eye, Lock, TrendingUp, ArrowRight, Github, Twitter, MessageCircle, Crosshair, BarChart3 } from 'lucide-react'
import { Scene3D } from '../../../src/components/3d/Scene3D'
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/Card'
import Button from '../../../src/components/ui/Button'
import { CONFIG } from '../lib/config'

const features = [
  {
    icon: Lock,
    title: 'Encrypt',
    description: 'Submit encrypted trading intents using blocklock technology',
    step: '01'
  },
  {
    icon: Eye,
    title: 'Randomize',
    description: 'Privacy obfuscation with dummy intents and padding',
    step: '02'
  },
  {
    icon: TrendingUp,
    title: 'Equalize',
    description: 'Uniform clearing prices via AI-enhanced batch auctions',
    step: '03'
  }
]

const demoScenarios = [
  {
    title: 'Happy Path Demo',
    description: 'Submit encrypted intent → observe unlock → batch auction → uniform settlement',
    icon: Shield,
    link: '/trade'
  },
  {
    title: 'Attack Prevention',
    description: 'Simulate MEV attacks and observe how encryption prevents extraction',
    icon: Crosshair,
    link: '/attacker-lab'
  },
  {
    title: 'Live Analytics',
    description: 'Monitor real-time privacy metrics and fairness scores',
    icon: BarChart3,
    link: '/analytics'
  }
]

const stats = [
  { label: 'MEV Protected', value: '$2.4M+', change: '+15.2%' },
  { label: 'Privacy Score', value: '94.8%', change: '+2.1%' },
  { label: 'Attack Success', value: '0.12%', change: '-87.3%' },
  { label: 'Fair Settlements', value: '99.8%', change: '+0.1%' }
]

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {CONFIG.FEATURES.ENABLE_3D_ANIMATIONS && (
          <Scene3D className="absolute inset-0 opacity-30" />
        )}
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-primary-500/20 text-primary-400 rounded-full text-sm font-medium border border-primary-500/30">
                Prototype Demo
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Encrypt</span>
              <span className="text-ghost-300 mx-4">•</span>
              <span className="gradient-text">Randomize</span>
              <span className="text-ghost-300 mx-4">•</span>
              <span className="gradient-text">Equalize</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-ghost-300 mb-8 max-w-4xl mx-auto">
              A comprehensive demonstration of encrypted intent trading with MEV protection.
              Experience the three-step workflow that eliminates front-running and ensures fair pricing.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/trade">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                  Learn How It Works
                </Button>
              </Link>
            </div>

            {/* Quick Links */}
            <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {demoScenarios.map((scenario, index) => (
                <Link key={scenario.title} to={scenario.link}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-4 glass-effect rounded-lg hover:bg-ghost-800/50 transition-colors group"
                  >
                    <scenario.icon className="w-6 h-6 text-primary-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-medium text-white mb-1">{scenario.title}</h3>
                    <p className="text-xs text-ghost-400">{scenario.description}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-ghost-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-ghost-300 text-sm mb-1">{stat.label}</div>
                <div className={`text-xs ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Three-Step Process */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Three-Step MEV Protection
            </h2>
            <p className="text-xl text-ghost-300 max-w-3xl mx-auto">
              Our comprehensive approach to eliminating MEV extraction through 
              encryption, randomization, and fair pricing mechanisms.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <Card hover glow>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-6xl font-bold text-primary-500/20">
                        {feature.step}
                      </div>
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-ghost-300">{feature.description}</p>
                  </CardContent>
                </Card>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-effect rounded-2xl p-12 glow-effect"
          >
            <h2 className="text-4xl font-bold gradient-text mb-6">
              Experience MEV-Free Trading
            </h2>
            <p className="text-xl text-ghost-300 mb-8">
              Try the prototype and see how GhostLock protects your trades from MEV extraction.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/trade">
                <Button size="lg" className="w-full sm:w-auto">
                  Launch Prototype
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              
              <div className="flex gap-4 justify-center">
                <Link to={'https://github.com/Nkovaturient/GhostLock-MEV-Reaper'} target='_blank'>
                  <Button variant="ghost" size="lg">
                    <Github className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to={'https://x.com/RandamuInc'} target='_blank'>
                  <Button variant="ghost" size="lg">
                    <Twitter className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to={'https://docs.dcipher.network/'} target='_blank'>
                  <Button variant="ghost" size="lg">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}