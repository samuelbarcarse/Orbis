import React, { useState } from 'react';
import { Shield, Clock, MapPin, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function RecoveryRecommendations({ region }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a marine conservation expert. Generate adaptive recovery recommendations for this ocean region:

Region: ${region.name}
Risk Score: ${region.risk_score}/100
Risk Level: ${region.risk_level}
Fishing Intensity: ${region.fishing_intensity}%
Ecosystem Fragility: ${region.ecosystem_fragility}/100
Fish Population Decline: ${region.population_decline}%
Coral Coverage: ${region.coral_coverage}%
Ocean Temperature: ${region.ocean_temp}°C
Biodiversity Index: ${region.biodiversity_index}/10
Active Vessels: ${region.vessel_count}
Anomalous Vessels: ${region.anomalous_vessels}
Protected Area: ${region.protected_area ? 'Yes' : 'No'}

Provide:
1. 3-5 specific, actionable recovery recommendations
2. Suggested temporary conservation zones or cooldown periods
3. Expected timeline for recovery
4. Key risk factors to address first

Format in clean markdown with headers.`,
    });
    setRecommendations(result);
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recovery Recommendations</h3>
        <Button 
          onClick={generateRecommendations} 
          disabled={loading}
          size="sm" 
          variant="outline"
          className="text-xs gap-1.5"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? 'Analyzing...' : 'Generate AI Recommendations'}
        </Button>
      </div>

      {!recommendations && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">
            Click "Generate AI Recommendations" to get adaptive recovery strategies for this region.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Analyzing ecosystem data and generating recovery plan...</p>
        </div>
      )}

      {recommendations && (
        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{recommendations}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}