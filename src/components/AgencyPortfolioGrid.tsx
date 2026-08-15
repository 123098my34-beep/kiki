import React from 'react';
import { ClientPacingSummary } from '../types';

interface Props {
  clients: ClientPacingSummary[];
}

export const AgencyPortfolioGrid: React.FC<Props> = ({ clients }) => {
  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agency Portfolio Command Center</h1>
          <p className="text-slate-400 text-sm">Real-time pacing and retention health across all active client stores</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">
            1-Click Multi-Client Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => {
          const statusColors = {
            on_track: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            at_risk: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          }[client.healthStatus];

          return (
            <div key={client.clientId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-100">{client.clientName}</h3>
                  <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full border ${statusColors}`}>
                    {client.healthStatus.replace('_', ' ').toUpperCase()} ({client.pacingPercentage}%)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Target</span>
                  <p className="text-sm font-semibold">${client.monthlyTarget.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
                <div 
                  className={`h-full rounded-full ${
                    client.pacingPercentage >= 100 ? 'bg-emerald-500' :
                    client.pacingPercentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, client.pacingPercentage)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-sm">
                <div>
                  <p className="text-xs text-slate-400">MTD Net Revenue</p>
                  <p className="font-medium text-slate-200">${client.mtdNetRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Required Daily Run</p>
                  <p className="font-medium text-slate-200">${Math.round(client.requiredDailyRunRate).toLocaleString()}/day</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
