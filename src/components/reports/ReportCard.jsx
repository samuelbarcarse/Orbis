import React from 'react';
import { FileText, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const typeColors = {
  risk_assessment: 'bg-destructive/10 text-destructive',
  impact_analysis: 'bg-chart-3/10 text-chart-3',
  recovery_plan: 'bg-accent/10 text-accent',
  trend_summary: 'bg-chart-1/10 text-chart-1',
};

const typeLabels = {
  risk_assessment: 'Risk Assessment',
  impact_analysis: 'Impact Analysis',
  recovery_plan: 'Recovery Plan',
  trend_summary: 'Trend Summary',
};

export default function ReportCard({ report, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <Badge className={cn("text-[10px]", typeColors[report.report_type])}>
          {typeLabels[report.report_type] || report.report_type}
        </Badge>
      </div>
      <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {report.title}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{report.summary}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {report.region_name}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {report.created_date ? format(new Date(report.created_date), 'MMM d, yyyy') : 'Recent'}
        </span>
      </div>
    </div>
  );
}