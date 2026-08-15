import React, { useState } from 'react';

export const DiscountCannibalizationCalculator: React.FC = () => {
  const [clientCount, setClientCount] = useState<number>(12);
  const [avgClientMonthlyRevenue, setAvgClientMonthlyRevenue] = useState<number>(120000);
  const [discountOrderRate, setDiscountOrderRate] = useState<number>(35); // 35% orders use a discount

  // Calculations
  const portfolioMonthlyRevenue = clientCount * avgClientMonthlyRevenue;
  const totalDiscountedRevenue = portfolioMonthlyRevenue * (discountOrderRate / 100);
  // Average discount depth 15%, ~40% cannibalization on organic high-intent buyers
  const totalDiscountsGiven = totalDiscountedRevenue * 0.15;
  const estimatedCannibalizedMargin = totalDiscountsGiven * 0.42;
  const annualMarginRecoverable = estimatedCannibalizedMargin * 12;
  const hoursSavedPerMonth = clientCount * 12; // 12 hours/client/mo automated

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-4xl mx-auto text-slate-100 shadow-2xl">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
          Interactive ROI & Margin Calculator
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold mt-3 text-slate-100">
          Calculate Your Agency’s Hidden Margin Loss & Time Waste
        </h2>
        <p className="text-slate-400 text-sm mt-2">
          Discover how much client revenue is being lost to discount cannibalization and manual slide deck creation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Active Client Stores Managed: <span className="text-indigo-400 font-bold">{clientCount}</span>
          </label>
          <input
            type="range"
            min="3"
            max="60"
            value={clientCount}
            onChange={(e) => setClientCount(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Avg. Store Monthly Sales: <span className="text-indigo-400 font-bold">${avgClientMonthlyRevenue.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min="20000"
            max="500000"
            step="10000"
            value={avgClientMonthlyRevenue}
            onChange={(e) => setAvgClientMonthlyRevenue(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Orders Using Discounts: <span className="text-indigo-400 font-bold">{discountOrderRate}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="70"
            value={discountOrderRate}
            onChange={(e) => setDiscountOrderRate(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950 p-6 rounded-xl border border-slate-800">
        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium">Monthly Cannibalized Margin</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">
            ${Math.round(estimatedCannibalizedMargin).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500">Unnecessary discount subsidies</span>
        </div>

        <div className="text-center border-y md:border-y-0 md:border-x border-slate-800 py-4 md:py-0">
          <p className="text-xs text-slate-400 font-medium">Annual Margin You Can Save Clients</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">
            ${Math.round(annualMarginRecoverable).toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-400/80">Pure bottom-line profit recovered</span>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium">Agency Hours Saved Monthly</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {hoursSavedPerMonth} hrs/mo
          </p>
          <span className="text-[11px] text-slate-500">Automated daily Slack & PDF decks</span>
        </div>
      </div>
    </div>
  );
};
