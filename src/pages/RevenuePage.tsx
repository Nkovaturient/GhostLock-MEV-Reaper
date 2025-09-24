import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Shield, Star, Mail } from 'lucide-react'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'

const tiers = [
  {
    id: 'free',
    title: 'Free',
    price: '0',
    subtitle: 'Community / Builders',
    perks: [
      'Encrypt & submit intents (limited)',
      'Basic batch settlement',
      'Explorer & basic analytics',
      'Community support'
    ],
    cta: 'Start Free'
  },
  {
    id: 'premium',
    title: 'Premium',
    price: '19',
    subtitle: 'Power Traders',
    perks: [
      'Unlimited intents',
      'Priority AI batching',
      'Advanced analytics & reports',
      'Early feature access'
    ],
    cta: 'Upgrade'
  },
  {
    id: 'pro',
    title: 'Pro',
    price: 'Custom',
    subtitle: 'Protocols & Institutions',
    perks: [
      'Dedicated solver slot',
      'Private SDK integration',
      'SLA & bonded guarantees',
      'On-chain subscription options'
    ],
    cta: 'Contact Sales'
  }
]

export default function RevenuePage() {
  return (
    <div className="relative overflow-hidden py-16">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">Choose Your Shield</h1>
          <p className="text-ghost-300 max-w-2xl mx-auto text-lg mb-6">
            Pick a plan that fits your usage. All tiers protect you from MEV extraction — upgrade for priority, analytics, and enterprise features.
          </p>

          <div className="flex justify-center gap-4 items-center">
            <Button size="lg" className="w-40">
              Start Free
            </Button>
            <Link to="/docs">
              <Button variant="ghost" size="lg" className="w-40">
                Learn More
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex justify-center gap-6">
            <div className="glass-effect p-4 rounded-lg shadow-sm flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary-400" />
              <div className="text-left">
                <div className="text-sm text-ghost-300">Protected Volume</div>
                <div className="text-xl font-bold gradient-text">$2.4M+</div>
              </div>
            </div>
            <div className="glass-effect p-4 rounded-lg shadow-sm flex items-center gap-3">
              <Star className="w-5 h-5 text-primary-400" />
              <div className="text-left">
                <div className="text-sm text-ghost-300">Avg Slippage</div>
                <div className="text-xl font-bold gradient-text">0.12%</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* TIER CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, idx) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
              <Card className={`glass-effect p-6 floating-card ${t.id === 'premium' ? 'border-primary-500/40 shadow-primary-500/20' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.title}</h3>
                      <div className="text-ghost-300 text-sm">{t.subtitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold gradient-text">${t.price}</div>
                      <div className="text-xs text-ghost-400">/mo</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 mt-1" />
                        <span className="text-ghost-300">{p}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex gap-3">
                    {t.id === 'pro' ? (
                      <Link to="/contact">
                        <Button size="lg" className="w-full">
                          Contact Sales
                        </Button>
                      </Link>
                    ) : (
                      <Button size="lg" className="w-full">
                        {t.cta}
                      </Button>
                    )}
                    <Button variant="ghost" size="lg" className="w-24">
                      <Mail className="w-4 h-4 mr-2" />
                      Info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
          <h2 className="text-3xl font-bold mb-6 gradient-text text-center">Compare Plans</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left glass-effect rounded-lg overflow-hidden">
              <thead className="bg-ghost-900/40">
                <tr>
                  <th className="px-6 py-4 text-sm text-ghost-300">Feature</th>
                  <th className="px-6 py-4 text-sm text-ghost-300">Free</th>
                  <th className="px-6 py-4 text-sm text-ghost-300">Premium</th>
                  <th className="px-6 py-4 text-sm text-ghost-300">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['Encrypted intents', '✅', '✅', '✅'],
                  ['Batch settlement', '✅', '✅', '✅'],
                  ['AI-assisted priority', '—', '✅', '✅'],
                  ['Dedicated solver', '—', '—', '✅'],
                  ['Advanced analytics', '—', '✅', '✅'],
                  ['On-chain SLA & Bonding', '—', '—', '✅'],
                  ['SDK + Private API', '—', '—', '✅']
                ].map((row, i) => (
                  <tr key={i} className="odd:bg-ghost-900/10">
                    <td className="px-6 py-4 text-ghost-300">{row[0]}</td>
                    <td className="px-6 py-4">{row[1]}</td>
                    <td className="px-6 py-4">{row[2]}</td>
                    <td className="px-6 py-4">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
        <motion.div initial={{ y: 12, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }}>
          <div className="glass-effect p-8 rounded-2xl">
            <h3 className="text-2xl font-bold mb-2">Ready to protect your trades?</h3>
            <p className="text-ghost-300 mb-6">Start with the Free plan and upgrade when you need high-performance batching, SDK access, or enterprise guarantees.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free
              </Button>
              <Link to="/contact">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                  Contact Sales
                </Button>
              </Link>
            </div>

            <p className="text-xs text-ghost-400 mt-4">Payments will later be supported with Stripe and on-chain subscription contracts (token & stablecoin options).</p>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
