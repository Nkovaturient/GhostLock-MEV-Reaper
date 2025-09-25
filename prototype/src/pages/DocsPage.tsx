import { motion } from 'framer-motion'
import { Book, Lock, Eye, TrendingUp, Shield, Zap, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/Card'
import Button from '../../../src/components/ui/Button'

export default function DocsPage() {
  const processSteps = [
    {
      step: '01',
      title: 'Encrypt Intent',
      icon: Lock,
      description: 'Users submit trading intents that are immediately encrypted using blocklock technology. The intent details remain completely hidden from MEV bots and other participants until the designated execution block.',
      features: [
        'Time-locked encryption using blocklock',
        'Intent details hidden until execution',
        'Cryptographic commitment schemes',
        'Tamper-proof intent storage'
      ]
    },
    {
      step: '02',
      title: 'Randomize & Obfuscate',
      icon: Eye,
      description: 'Privacy hardening through dummy intent generation and ciphertext padding. This prevents size-based analysis and obscures real trading patterns from potential attackers.',
      features: [
        'Configurable dummy intent generation',
        'Ciphertext padding to prevent size analysis',
        'Randomized submission timing',
        'Privacy health scoring'
      ]
    },
    {
      step: '03',
      title: 'Equalize Pricing',
      icon: TrendingUp,
      description: 'AI-enhanced batch auctions with uniform pricing eliminate front-running opportunities. VRF-based ordering ensures fair sequencing while dual pricing methods provide optimal execution.',
      features: [
        'AI-enhanced price optimization',
        'VRF-based fair ordering',
        'Uniform price batch settlement',
        'MEV protection premium calculation'
      ]
    }
  ]

  const technicalSpecs = [
    {
      category: 'Encryption',
      items: [
        'Blocklock time-based encryption',
        'BLS signature aggregation',
        'Threshold cryptography',
        'Verifiable decryption'
      ]
    },
    {
      category: 'Privacy',
      items: [
        'Dummy intent generation',
        'Ciphertext padding',
        'Timing randomization',
        'Size obfuscation'
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
      category: 'AI Enhancement',
      items: [
        'MEV risk detection',
        'Price optimization',
        'Confidence scoring',
        'Fairness validation'
      ]
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
          <div className="flex items-center space-x-3 mb-4">
            <Book className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-4xl font-bold gradient-text">
                Prototype Documentation
              </h1>
              <p className="text-ghost-300 text-lg">
                Complete guide to the Encrypt.Randomize.Equalize workflow
              </p>
            </div>
          </div>
        </motion.div>

        {/* Process Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Three-Step MEV Protection Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {processSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="relative flex items-start space-x-6"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {step.step}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <step.icon className="w-6 h-6 text-primary-400" />
                      <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-ghost-300 leading-relaxed mb-4">{step.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-2">
                      {step.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-2 text-sm text-ghost-400">
                          <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {index < processSteps.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gradient-to-b from-primary-500 to-transparent" />
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technical Specifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {technicalSpecs.map((spec, index) => (
                <motion.div
                  key={spec.category}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
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

        {/* Demo Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Demo Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Submit Intent',
                    description: 'Go to Trade page and submit an encrypted trading intent with privacy settings',
                    icon: Zap,
                    link: '/trade'
                  },
                  {
                    title: 'Monitor Auctions',
                    description: 'Watch batch auctions with AI and deterministic pricing methods',
                    icon: TrendingUp,
                    link: '/auctions'
                  },
                  {
                    title: 'Simulate Attacks',
                    description: 'Use Attacker Lab to see how MEV attempts are prevented',
                    icon: Shield,
                    link: '/attacker-lab'
                  }
                ].map((instruction, index) => (
                  <motion.div
                    key={instruction.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-ghost-800/30 rounded-lg border border-ghost-700"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <instruction.icon className="w-5 h-5 text-primary-400" />
                      <h4 className="font-medium text-white">{instruction.title}</h4>
                    </div>
                    <p className="text-sm text-ghost-400 mb-3">{instruction.description}</p>
                    <Button size="sm" variant="ghost" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Try Now
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Resources */}
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
                  whileInView={{ opacity: 1, y: 0 }}
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
  )
}