import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const getColor = (value) => {
  if (value >= 75) return 'hsl(4, 80%, 58%)';
  if (value >= 50) return 'hsl(35, 90%, 55%)';
  if (value >= 25) return 'hsl(190, 80%, 45%)';
  return 'hsl(170, 60%, 42%)';
};

export default function RiskBreakdown({ region }) {
  const data = [
    { name: 'Fishing Intensity', value: region.fishing_intensity || 0 },
    { name: 'Ecosystem Fragility', value: region.ecosystem_fragility || 0 },
    { name: 'Population Decline', value: region.population_decline || 0 },
    { name: 'Anomalous Vessels', value: region.anomalous_vessels ? Math.min(100, region.anomalous_vessels * 10) : 0 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-4">Risk Factor Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
          <Tooltip
            contentStyle={{ 
              background: 'hsl(215, 28%, 9%)', 
              border: '1px solid hsl(215, 18%, 16%)', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}