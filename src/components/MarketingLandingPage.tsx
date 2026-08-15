import React from 'react';
import { DiscountCannibalizationCalculator } from './DiscountCannibalizationCalculator';

export const MarketingLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white">P</div>
          <span className="text-xl font-bold tracking-tight text-white">Pulse Retention</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#calculator" className="text-sm text-slate-400 hover:text-white transition">ROI Calculator</a>
          <a href="#features" className="text-sm text-slate-400 hover:text-white transition">Features</a>
          <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-indigo-600/20">
            Book 14-Day Free Audit
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          The Autonomous Retention Operating System for Agencies
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Stop guessing in Klaviyo.<br />
          <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Deliver True Net Margin & Zero-Touch Client Reports.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Reconcile Shopify net payouts with ESP attribution, detect decaying automation flows before clients notice, and eliminate discount cannibalization across your entire brand portfolio.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-bold transition shadow-xl shadow-indigo-600/30">
            Start 14-Day Free Agency Audit →
          </button>
          <button className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-base font-medium transition">
            View Sample Executive Deck (PDF)
          </button>
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section id="calculator" className="py-16 px-6 bg-slate-900/40 border-y border-slate-900">
        <DiscountCannibalizationCalculator />
      </section>

      {/* Strategic Value Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Built for High-Velocity Retention Agencies</h2>
          <p className="text-slate-400 text-sm mt-2">Everything you need to manage 10–50 accounts with zero reporting friction</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-4">01</div>
            <h3 className="text-lg font-bold text-white mb-2">True Contribution Margin</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Deducts refunds, discounts, and recurring subscription rebills (Recharge) from Klaviyo attribution to show real marketing contribution.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">02</div>
            <h3 className="text-lg font-bold text-white mb-2">Automated 8:00 AM Slack Digests</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Delivers daily pacing vs monthly goals and flow decay alerts straight to Account Managers' Slack channels every morning.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-4">03</div>
            <h3 className="text-lg font-bold text-white mb-2">1-Click Bi-Directional Action</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Identifies high-AOV churn risks and automatically syncs dynamic winback segments straight back into Klaviyo with one click.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Transparent Agency Pricing</h2>
          <p className="text-slate-400 text-sm mt-2">Scale seamlessly as your client roster expands</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white">Starter Agency</h3>
            <div className="text-3xl font-black text-white my-4">$299<span className="text-sm font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400 mb-6">Up to 5 connected client stores</p>
            <ul className="text-sm text-slate-300 space-y-3 mb-8">
              <li>✓ Real-Time Pacing Dashboards</li>
              <li>✓ True Net Margin Reconciliation</li>
              <li>✓ Daily Morning Slack Briefings</li>
            </ul>
            <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-sm transition">Start Free Pilot</button>
          </div>

          <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl p-8 relative shadow-2xl shadow-indigo-500/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
            <h3 className="text-lg font-bold text-white">Growth Agency</h3>
            <div className="text-3xl font-black text-white my-4">$599<span className="text-sm font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400 mb-6">Up to 15 connected client stores</p>
            <ul className="text-sm text-slate-300 space-y-3 mb-8">
              <li>✓ Everything in Starter</li>
              <li>✓ Cross-Portfolio Benchmarking</li>
              <li>✓ Flow Decay Anomaly Detector</li>
              <li>✓ 1-Click Executive PDF Decks</li>
            </ul>
            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition">Start Free Pilot</button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white">Scale Agency</h3>
            <div className="text-3xl font-black text-white my-4">$999<span className="text-sm font-normal text-slate-400">/mo</span></div>
            <p className="text-xs text-slate-400 mb-6">Up to 35 connected client stores</p>
            <ul className="text-sm text-slate-300 space-y-3 mb-8">
              <li>✓ Everything in Growth</li>
              <li>✓ Custom White-Label CNAME Domains</li>
              <li>✓ 1-Click Klaviyo Segment Push</li>
              <li>✓ Priority Dedicated Support</li>
            </ul>
            <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-sm transition">Start Free Pilot</button>
          </div>
        </div>
      </section>
    </div>
  );
};
