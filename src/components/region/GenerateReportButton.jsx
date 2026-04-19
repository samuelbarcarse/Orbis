import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

export default function GenerateReportButton({ region }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a concise environmental impact report for this marine region:

Region: ${region.name}
Ocean: ${region.ocean}
Risk Score: ${region.risk_score}/100 (${region.risk_level})
Fishing Intensity: ${region.fishing_intensity}%
Ecosystem Fragility: ${region.ecosystem_fragility}/100
Fish Population Decline: ${region.population_decline}%
Coral Coverage: ${region.coral_coverage}%
Ocean Temperature: ${region.ocean_temp}°C
Biodiversity Index: ${region.biodiversity_index}/10
Active Vessels: ${region.vessel_count}
Anomalous Vessels: ${region.anomalous_vessels}
Protected: ${region.protected_area ? 'Yes' : 'No'}

Write a professional environmental impact report in markdown. Include:
1. Executive Summary
2. Key Risk Factors
3. Ecosystem Health Assessment
4. Fishing Pressure Analysis
5. Recommendations

Keep it concise but data-driven.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          content: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    await base44.entities.ConservationReport.create({
      title: result.title || `Impact Report: ${region.name}`,
      region_name: region.name,
      report_type: 'impact_analysis',
      summary: result.summary || '',
      content: result.content || '',
      risk_score_at_time: region.risk_score,
      recommendations: result.recommendations || [],
      status: 'published',
    });

    queryClient.invalidateQueries({ queryKey: ['reports'] });
    toast({ title: 'Report Generated', description: `Impact report for ${region.name} has been created.` });
    setLoading(false);
  };

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm" className="gap-1.5">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      {loading ? 'Generating...' : 'Generate Report'}
    </Button>
  );
}