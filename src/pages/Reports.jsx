import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, FileText, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import ReportCard from '../components/reports/ReportCard';

export default function Reports() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.ConservationReport.list('-created_date'),
  });

  const filtered = reports.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.region_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || r.report_type === typeFilter;
    return matchSearch && matchType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Conservation Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-generated environmental impact reports and assessments</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Report Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
            <SelectItem value="impact_analysis">Impact Analysis</SelectItem>
            <SelectItem value="recovery_plan">Recovery Plan</SelectItem>
            <SelectItem value="trend_summary">Trend Summary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(report => (
          <ReportCard key={report.id} report={report} onClick={() => setSelectedReport(report)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reports yet. Generate one from a region detail page.</p>
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReport.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedReport.region_name}</p>
              </DialogHeader>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{selectedReport.content || selectedReport.summary || 'No content available.'}</ReactMarkdown>
              </div>
              {selectedReport.recommendations?.length > 0 && (
                <div className="mt-4 p-4 bg-accent/5 rounded-xl border border-accent/20">
                  <h4 className="text-sm font-semibold text-accent mb-2">Recommendations</h4>
                  <ul className="space-y-1.5">
                    {selectedReport.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}