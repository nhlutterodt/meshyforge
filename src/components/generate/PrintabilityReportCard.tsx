// src/components/generate/PrintabilityReportCard.tsx
// Source: FRD FR-PRINT-02, CSD §5
//
// Renders the printability report an analyze task produces once it reaches
// SUCCEEDED. Meshy_Documentation/ has no published schema for
// /v1/print/analyze's completed-task payload (the doc set stops at
// 18-animation.md). Since ADR-0015 step 2, poll_task returns a normalized
// camelCase TaskSnapshot; this card reads the raw print fields from the
// snapshot's `providerPayload`, which is **transitional per ADR-0015 TPC-06
// and retired in step 4** (either a typed `printReport` field on the
// snapshot, populated from a confirmed live response, or an explicit decision
// to keep it opaque). Until then the field names below remain a best-effort
// mapping from FR-PRINT-02's acceptance-criteria field list onto the provider
// wire convention (snake_case inside the raw payload).
// parsePrintabilityReport degrades to safe defaults instead of throwing if
// the live API uses different field names — treat this shape as provisional
// until confirmed against a real response.

import { Badge } from '@components/ui/badge';
import type { PrintabilityReport } from '@lib/meshy-types';
import { cn } from '@lib/utils';

// Transitional (TPC-06): parsePrintabilityReport's caller passes
// TaskSnapshot.providerPayload, so the snake_case fields below are read from
// the raw payload, never from snapshot-typed fields. The parsing behavior is
// unchanged from step 1.
export function parsePrintabilityReport(raw: unknown): PrintabilityReport | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const statusRaw = r.printability_status;
  const status: PrintabilityReport['status'] =
    statusRaw === 'healthy' || statusRaw === 'error' ? statusRaw : 'warning';

  return {
    status,
    issueCount: typeof r.issue_count === 'number' ? r.issue_count : 0,
    watertight: typeof r.watertight === 'boolean' ? r.watertight : false,
    volume: typeof r.volume === 'number' ? r.volume : 0,
    nonManifoldEdgeCount:
      typeof r.non_manifold_edge_count === 'number' ? r.non_manifold_edge_count : 0,
    degenerateFaceCount: typeof r.degenerate_face_count === 'number' ? r.degenerate_face_count : 0,
    holeCount: typeof r.hole_count === 'number' ? r.hole_count : 0,
  };
}

const STATUS_STYLES: Record<PrintabilityReport['status'], string> = {
  healthy: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-danger/10 text-danger',
};

interface PrintabilityReportCardProps {
  readonly report: PrintabilityReport;
}

export function PrintabilityReportCard({ report }: PrintabilityReportCardProps) {
  return (
    <div className="space-y-3 rounded-lg border p-3" data-testid="printability-report">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Printability Report</span>
        <Badge variant="secondary" className={cn('text-xs', STATUS_STYLES[report.status])}>
          {report.status}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
        <dt>Issues found</dt>
        <dd className="text-right">{report.issueCount}</dd>
        <dt>Watertight</dt>
        <dd className="text-right">{report.watertight ? 'Yes' : 'No'}</dd>
        <dt>Volume</dt>
        <dd className="text-right">{report.volume}</dd>
        <dt>Non-manifold edges</dt>
        <dd className="text-right">{report.nonManifoldEdgeCount}</dd>
        <dt>Degenerate faces</dt>
        <dd className="text-right">{report.degenerateFaceCount}</dd>
        <dt>Holes</dt>
        <dd className="text-right">{report.holeCount}</dd>
      </dl>
    </div>
  );
}
