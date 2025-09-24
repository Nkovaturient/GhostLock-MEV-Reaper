import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Zap, Eye, Lock, TrendingUp, Users, ArrowRight, Github, Twitter, MessageCircle } from 'lucide-react'
import { Scene3D } from '../components/3d/Scene3D'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'

const features = [
  {
    icon: Shield,
    title: 'MEV Protection',
    description: 'Advanced encryption shields your trades from front-running and sandwich attacks'
  },
  {
    icon: Lock,
    title: 'Blocklock Encryption',
    description: 'Time-locked encryption ensures fair ordering and prevents information leakage'
  },
  {
    icon: TrendingUp,
    title: 'Batch Auctions',
    description: 'Uniform pricing through batch settlement eliminates price manipulation'
  },
  {
    icon: Eye,
    title: 'VRF Ordering',
    description: 'Verifiable random function ensures unbiased transaction ordering'
  },
  {
    icon: Zap,
    title: 'AI Optimization',
    description: 'Machine learning algorithms optimize settlement prices and reduce slippage'
  },
  {
    icon: Users,
    title: 'Fair Access',
    description: 'Equal opportunity trading for all participants, regardless of size'
  }
]

const stats = [
  { label: 'MEV Protected', value: '$2.4M+', change: '+15.2%' },
  { label: 'Active Traders', value: '1,247', change: '+8.7%' },
  { label: 'Avg. Slippage', value: '0.12%', change: '-23.1%' },
  { label: 'Success Rate', value: '99.8%', change: '+0.1%' }
]

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <Scene3D className="absolute inset-0 opacity-30" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">GhostLock</span>
              <br />
              <span className="text-white text-shadow">MEV Reaper</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-ghost-300 mb-8 max-w-3xl mx-auto">
              A stealth shield against MEV, encrypting trades and settling them fair.
              Protect your transactions with cutting-edge blocklock technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/trade">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Trading
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary-500 rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
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

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              Advanced MEV Protection
            </h2>
            <p className="text-xl text-ghost-300 max-w-3xl mx-auto">
              Cutting-edge technology stack designed to eliminate MEV extraction
              and ensure fair trading for everyone.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card hover glow>
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-ghost-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-ghost-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
              How It Works
            </h2>
            <p className="text-xl text-ghost-300 max-w-3xl mx-auto">
              A sophisticated multi-layer approach to MEV protection
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Encrypt Intent',
                description: 'Your trading intent is encrypted using blocklock technology, hiding it from MEV bots until execution time.'
              },
              {
                step: '02',
                title: 'Batch & Order',
                description: 'Encrypted intents are batched together and ordered using verifiable random functions for fairness.'
              },
              {
                step: '03',
                title: 'Fair Settlement',
                description: 'AI-optimized batch auctions ensure uniform pricing and eliminate front-running opportunities.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-primary-500/20 mb-4">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-ghost-300">{item.description}</p>
                
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
              Ready to Trade Without Fear?
            </h2>
            <p className="text-xl text-ghost-300 mb-8">
              Join the revolution against MEV extraction. Start trading with GhostLock today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/trade">
                <Button size="lg" className="w-full sm:w-auto">
                  Launch App
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              
              <div className="flex gap-4 justify-center">
                <Link to={'https://github.com/Nkovaturient/GhostLock-MEV-Reaper'} target='_block'>
                <Button variant="ghost" size="lg">
                  <Github className="w-5 h-5" />
                </Button>
                </Link>
                <Link to={'https://x.com/RandamuInc'} target='_block'>
                <Button variant="ghost" size="lg">
                  <Twitter className="w-5 h-5" />
                </Button>
                </Link>
                <Link to={'https://docs.dcipher.network/'} target='_block'>
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