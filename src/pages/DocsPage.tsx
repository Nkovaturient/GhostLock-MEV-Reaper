import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Zap, Eye, TrendingUp, Users, Code, Book, ExternalLink, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    icon: Book,
    content: `GhostLock: MEV Reaper is a cutting-edge platform that protects traders from MEV (Maximal Extractable Value) attacks through advanced encryption and fair ordering mechanisms.`
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    icon: Zap,
    content: `The platform uses blocklock encryption to hide trading intents until execution time, combined with VRF-based ordering and batch auctions for fair settlement.`
  },
  {
    id: 'features',
    title: 'Key Features',
    icon: Shield,
    content: `Advanced MEV protection, time-locked encryption, fair ordering, batch settlements, AI optimization, and equal access for all traders.`
  },
  {
    id: 'integration',
    title: 'Integration Guide',
    icon: Code,
    content: `Learn how to integrate GhostLock into your trading application using our comprehensive APIs and smart contract interfaces.`
  }
]

const features = [
  {
    icon: Shield,
    title: 'MEV Protection',
    description: 'Advanced encryption shields your trades from front-running and sandwich attacks using blocklock technology.'
  },
  {
    icon: Lock,
    title: 'Time-Locked Encryption',
    description: 'Trading intents are encrypted and only revealed at execution time, preventing information leakage.'
  },
  {
    icon: Eye,
    title: 'VRF Ordering',
    description: 'Verifiable Random Function ensures unbiased and fair transaction ordering for all participants.'
  },
  {
    icon: TrendingUp,
    title: 'Batch Auctions',
    description: 'Uniform pricing through batch settlement eliminates price manipulation and reduces slippage.'
  },
  {
    icon: Zap,
    title: 'AI Optimization',
    description: 'Machine learning algorithms optimize settlement prices and improve execution efficiency.'
  },
  {
    icon: Users,
    title: 'Fair Access',
    description: 'Equal opportunity trading for all participants, regardless of transaction size or timing.'
  }
]

const technicalSpecs = [
  {
    category: 'Encryption',
    items: [
      'Blocklock time-based encryption',
      'AES-256 symmetric encryption',
      'Elliptic curve cryptography',
      'Zero-knowledge proofs'
    ]
  },
  {
    category: 'Consensus',
    items: [
      'VRF-based ordering',
      'Batch auction mechanism',
      'Uniform price clearing',
      'Pro-rata allocation'
    ]
  },
  {
    category: 'Network',
    items: [
      'Base Sepolia testnet',
      'EVM compatibility',
      'Gas optimization',
      'Layer 2 scaling'
    ]
  }
]

const apiEndpoints = [
  {
    method: 'POST',
    endpoint: '/api/intents/submit',
    description: 'Submit encrypted trading intent'
  },
  {
    method: 'GET',
    endpoint: '/api/intents/user/:address',
    description: 'Get user trading intents'
  },
  {
    method: 'GET',
    endpoint: '/api/auctions',
    description: 'Get auction data and history'
  },
  {
    method: 'GET',
    endpoint: '/api/markets/stats',
    description: 'Get market statistics and metrics'
  }
]

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Documentation
          </h1>
          <p className="text-ghost-300 text-lg">
            Complete guide to integrating and using GhostLock: MEV Reaper
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${activeSection === section.id
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'text-ghost-300 hover:bg-ghost-800 hover:text-white'
                        }`}
                    >
                      <section.icon className="w-4 h-4" />
                      <span>{section.title}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Book className="w-5 h-5 text-primary-400" />
                      <span>Platform Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-invert max-w-none">
                    <p className="text-ghost-300 leading-relaxed">
                      GhostLock: MEV Reaper is a revolutionary trading platform designed to eliminate
                      Maximal Extractable Value (MEV) attacks through advanced cryptographic techniques
                      and fair ordering mechanisms. The platform ensures that all traders, regardless
                      of size, have equal access to fair pricing and execution.
                    </p>

                    <h3 className="text-xl font-semibold text-white mt-6 mb-4">Core Components</h3>

                    <div className="grid md:grid-cols-2 gap-4 not-prose">
                      {features.map((feature, index) => (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-primary-500/20 rounded-lg">
                              <feature.icon className="w-4 h-4 text-primary-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white mb-1">{feature.title}</h4>
                              <p className="text-sm text-ghost-400">{feature.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* How It Works Section */}
            {activeSection === 'how-it-works' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-primary-400" />
                      <span>Process Flow</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {[
                        {
                          step: '01',
                          title: 'Intent Encryption',
                          description: 'Users submit trading intents that are immediately encrypted using blocklock technology. The intent details remain hidden from MEV bots and other participants.',
                          icon: Lock
                        },
                        {
                          step: '02',
                          title: 'Fair Ordering',
                          description: 'Encrypted intents are collected and ordered using Verifiable Random Functions (VRF) to ensure unbiased sequencing without favoritism.',
                          icon: Eye
                        },
                        {
                          step: '03',
                          title: 'Batch Settlement',
                          description: 'At the target block, intents are decrypted and settled in batches using uniform pricing to eliminate front-running opportunities.',
                          icon: TrendingUp
                        }
                      ].map((step, index) => (
                        <motion.div
                          key={step.step}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.2 }}
                          className="relative flex items-start space-x-6"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                              {step.step}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <step.icon className="w-5 h-5 text-primary-400" />
                              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                            </div>
                            <p className="text-ghost-300 leading-relaxed">{step.description}</p>
                          </div>

                          {index < 2 && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gradient-to-b from-primary-500 to-transparent" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Features Section */}
            {activeSection === 'features' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-primary-400" />
                      <span>Technical Specifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {technicalSpecs.map((spec, index) => (
                        <motion.div
                          key={spec.category}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="space-y-3"
                        >
                          <h3 className="font-semibold text-white border-b border-ghost-700 pb-2">
                            {spec.category}
                          </h3>
                          <ul className="space-y-2">
                            {spec.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-center space-x-2 text-sm text-ghost-300">
                                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Security Features */}
                <Card>
                  <CardHeader>
                    <CardTitle>Security Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-white">Encryption Layer</h4>
                        <ul className="space-y-2 text-sm text-ghost-300">
                          <li>• Time-based encryption using blocklock</li>
                          <li>• Intent details hidden until execution</li>
                          <li>• Cryptographic commitment schemes</li>
                          <li>• Tamper-proof intent storage</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-white">Fair Ordering</h4>
                        <ul className="space-y-2 text-sm text-ghost-300">
                          <li>• VRF-based transaction sequencing</li>
                          <li>• Elimination of priority gas auctions</li>
                          <li>• Uniform price batch settlements</li>
                          <li>• Pro-rata allocation mechanisms</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Integration Section */}
            {activeSection === 'integration' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5 text-primary-400" />
                      <span>API Reference</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {apiEndpoints.map((endpoint, index) => (
                        <motion.div
                          key={endpoint.endpoint}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <Badge variant={endpoint.method === 'GET' ? 'info' : 'success'}>
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm font-mono text-primary-400">
                                {endpoint.endpoint}
                              </code>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-ghost-400">{endpoint.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Smart Contract Addresses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Smart Contract Addresses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">Testnet Deployment</span>
                        </div>
                        <p className="text-sm text-ghost-300">
                          Current contracts are deployed on Base Sepolia testnet for testing purposes.
                        </p>
                      </div>

                      <div className="grid gap-4">
                        {[
                          { name: 'GhostLock Intents', address: 'CONTRACT_ADDRESS_PLACEHOLDER' },
                          { name: 'Batch Settlement', address: 'CONTRACT_ADDRESS_PLACEHOLDER' },
                          { name: 'Epoch RNG', address: 'CONTRACT_ADDRESS_PLACEHOLDER' },
                          { name: 'Mock ETH Token', address: 'CONTRACT_ADDRESS_PLACEHOLDER' },
                          { name: 'Mock USDC Token', address: 'CONTRACT_ADDRESS_PLACEHOLDER' }
                        ].map((contract, index) => (
                          <motion.div
                            key={contract.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-ghost-800/30 rounded-lg"
                          >
                            <span className="font-medium">{contract.name}</span>
                            <code className="text-xs font-mono text-ghost-400 bg-ghost-700 px-2 py-1 rounded">
                              {contract.address}
                            </code>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Code Example */}
                <Card>
                  <CardHeader>
                    <CardTitle>Integration Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-ghost-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-ghost-300">
                        <code>{`// Submit encrypted trading intent
import { BlocklockService } from '@ghostlock/sdk'

const ghostlock = new BlocklockService(signer, chainId)

const intent = {
  market: 'ETH/USDC',
  side: 'buy',
  amount: '1.0',
  limitPrice: '3120.50',
  slippageBps: 50,
  targetBlock: currentBlock + 20
}

const encrypted = await ghostlock.encryptIntent(intent, targetBlock)
const tx = await contract.submitIntent(encrypted)`}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* External Resources */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Blocklock Solidity', url: 'https://github.com/randa-mu/blocklock-solidity' },
                  { name: 'Blocklock JS', url: 'https://github.com/randa-mu/blocklock-js' },
                  { name: 'Randomness Solidity', url: 'https://github.com/randa-mu/randomness-solidity' },
                  { name: 'Frontend Kit', url: 'https://github.com/rk-rishikesh/blocklock-frontend-kit' },
                  { name: 'Drand Documentation', url: 'https://docs.drand.love/' },
                  { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org/' }
                ].map((resource, index) => (
                  <motion.a
                    key={resource.name}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-ghost-800/30 rounded-lg border border-ghost-700 hover:border-primary-500/50 transition-colors group"
                  >
                    <span className="font-medium text-ghost-300 group-hover:text-white">
                      {resource.name}
                    </span>
                    <ExternalLink className="w-4 h-4 text-ghost-400 group-hover:text-primary-400" />
                  </motion.a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}