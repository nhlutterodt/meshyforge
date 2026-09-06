// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PrintabilityReportCard,
  parsePrintabilityReport,
} from '@components/generate/PrintabilityReportCard';

describe('parsePrintabilityReport', () => {
  it('maps a well-formed raw snake_case task result to the normalized report', () => {
    const report = parsePrintabilityReport({
      status: 'SUCCEEDED',
      printability_status: 'error',
      issue_count: 7,
      watertight: false,
      volume: 42.1,
      non_manifold_edge_count: 5,
      degenerate_face_count: 2,
      hole_count: 1,
    });

    expect(report).toEqual({
      status: 'error',
      issueCount: 7,
      watertight: false,
      volume: 42.1,
      nonManifoldEdgeCount: 5,
      degenerateFaceCount: 2,
      holeCount: 1,
    });
  });

  it('returns null for a non-object input', () => {
    expect(parsePrintabilityReport(null)).toBeNull();
    expect(parsePrintabilityReport('SUCCEEDED')).toBeNull();
  });

  it('defaults missing/unexpected fields instead of throwing', () => {
    const report = parsePrintabilityReport({ status: 'SUCCEEDED' });

    expect(report).toEqual({
      status: 'warning',
      issueCount: 0,
      watertight: false,
      volume: 0,
      nonManifoldEdgeCount: 0,
      degenerateFaceCount: 0,
      holeCount: 0,
    });
  });
});

describe('PrintabilityReportCard', () => {
  it('renders every FR-PRINT-02 report field', () => {
    render(
      <PrintabilityReportCard
        report={{
          status: 'healthy',
          issueCount: 0,
          watertight: true,
          volume: 100,
          nonManifoldEdgeCount: 0,
          degenerateFaceCount: 0,
          holeCount: 0,
        }}
      />,
    );

    expect(screen.getByText('Printability Report')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
