import React from 'react';
import { ReconciliationReport } from '../services/reconciliation.service';
import { MetricBenchmark } from '../services/benchmarking.service';

interface Props {
  reconciliation: ReconciliationReport;
  benchmark: MetricBenchmark;
}

export const ClientTrueMarginView: React.FC<Props> = ({ reconciliation, benchmark }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold">True Contribution Margin & Financial Reconciliation</h2>
          <p className="text-sm text-slate-400">Reconciled Shopify Net Payouts vs. ESP Attributed Revenue</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-indigo-400 font-semibold text-sm">
          True Retention Contribution: {reconciliation.netContributionMargin}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <p className="text-xs text-slate-400">Shopify True Net Sales</p>
          <p className="text-xl font-bold text-slate-100">${reconciliation.trueNetRevenue.toLocaleString()}</p>
          <span className="text-xs text-emerald-400">Net of refunds & discounts</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <p className="text-xs text-slate-400">ESP Attributed Gross</p>
          <p className="text-xl font-bold text-amber-400">${reconciliation.espAttributedGrossRevenue.toLocaleString()}</p>
          <span className="text-xs text-amber-400/80">Raw Klaviyo/Omnisend claim</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <p className="text-xs text-slate-400">Reconciled Retention Net</p>
          <p className="text-xl font-bold text-emerald-400">${reconciliation.espAttributedNetRevenue.toLocaleString()}</p>
          <span className="text-xs text-emerald-400/80">Excludes sub rebills & returns</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <p className="text-xs text-slate-400">Attribution Inflation</p>
          <p className="text-xl font-bold text-rose-400">-${reconciliation.reconciliationDiscrepancy.toLocaleString()}</p>
          <span className="text-xs text-rose-400/80">({reconciliation.discrepancyPercentage}% over-reported)</span>
        </div>
      </div>

      {/* Cross-Agency Portfolio Benchmark */}
      <div className="bg-slate-950/60 p-5 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">Agency Portfolio Benchmark ({benchmark.metricName})</h3>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
            Top {100 - benchmark.percentileRank}% Rank
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Store Value</p>
            <p className="font-medium text-slate-100">{benchmark.clientValue}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Agency Median</p>
            <p className="font-medium text-slate-100">{benchmark.portfolioMedian}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Top Quartile (P75)</p>
            <p className="font-medium text-emerald-400">{benchmark.topQuartileThreshold}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
