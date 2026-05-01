import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import "./TeacherPlagiarismReport.css";

type PairEntry = {
  student_a: { id: string; name: string };
  student_b: { id: string; name: string };
  similarity: number;
  flagged: boolean;
};

type StoredReport = {
  generatedAt: string;
  thresholdPercent: number;
  totalSubmissions: number;
  totalPairs: number;
  flaggedPairs: number;
  pairs: PairEntry[];
};

type NodeEntry = { id: string; name: string };

function nodeColor(index: number): string {
  const colors = ["#2563eb", "#059669", "#7c3aed", "#db2777", "#ea580c", "#0891b2"];
  return colors[index % colors.length];
}

export default function TeacherPlagiarismReport() {
  const { courseId, deliverableId } = useParams<{ courseId: string; deliverableId: string }>();
  const [assignmentTitle, setAssignmentTitle] = useState("Assignment");
  const [report, setReport] = useState<StoredReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [thresholdPercent, setThresholdPercent] = useState(70);
  const [filterMinScore, setFilterMinScore] = useState(70);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    if (!deliverableId) return;
    setLoading(true);
    setError(null);
    try {
      const [assignmentRes, reportRes] = await Promise.all([
        apiFetch(`/api/deliverables/${deliverableId}`),
        apiFetch(`/api/deliverables/${deliverableId}/plagiarism/report`),
      ]);
      const assignmentData = await assignmentRes.json();
      const reportData = await reportRes.json();

      if (!assignmentRes.ok) throw new Error(assignmentData.message || "Failed to load assignment");
      if (!reportRes.ok) throw new Error(reportData.message || "Failed to load plagiarism report");

      setAssignmentTitle(assignmentData?.deliverable?.title || "Assignment");

      if (reportData?.report) {
        setReport(reportData.report);
        const nextThreshold = Number(reportData.report.thresholdPercent || 70);
        setThresholdPercent(nextThreshold);
        setFilterMinScore(nextThreshold);
      } else {
        setReport(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load plagiarism report");
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    if (!deliverableId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/deliverables/${deliverableId}/plagiarism/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholdPercent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to run plagiarism check");

      await loadReport();
    } catch (err: any) {
      setError(err.message || "Failed to run plagiarism check");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const nodes: NodeEntry[] = useMemo(() => {
    const map = new Map<string, NodeEntry>();
    (report?.pairs || []).forEach((pair) => {
      map.set(pair.student_a.id, { id: pair.student_a.id, name: pair.student_a.name });
      map.set(pair.student_b.id, { id: pair.student_b.id, name: pair.student_b.name });
    });
    return Array.from(map.values());
  }, [report]);

  const filteredPairs = useMemo(
    () => (report?.pairs || []).filter((pair) => pair.similarity >= filterMinScore),
    [report, filterMinScore]
  );

  const nodePosition = (index: number, count: number, width: number, height: number) => {
    if (count <= 0) return { x: width / 2, y: height / 2 };
    const radius = Math.min(width, height) * 0.36;
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return {
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
    };
  };

  return (
    <main className="main-content">
      <div className="pr-head">
        <div>
          <div className="sa-breadcrumb">
            <Link to="/teacher-panel" className="sa-breadcrumb-link">Teacher Panel</Link>
            <span className="sa-breadcrumb-sep">›</span>
            <Link to={`/teacher-course/${courseId}`} className="sa-breadcrumb-link">Course</Link>
            <span className="sa-breadcrumb-sep">›</span>
            <span className="sa-breadcrumb-current">Plagiarism Checker</span>
          </div>
          <h1 className="page-title">{assignmentTitle}</h1>
          <p className="pr-subtitle">Interactive similarity network and student-pair analysis.</p>
        </div>

        <div className="pr-actions">
          <label className="pr-threshold">
            AI threshold %
            <input
              type="number"
              min={0}
              max={100}
              value={thresholdPercent}
              onChange={(e) => setThresholdPercent(Number(e.target.value))}
            />
          </label>
          <button className="btn btn-primary" onClick={runCheck} disabled={running || loading}>
            {running ? "Checking..." : "Run Plagiarism Check"}
          </button>
        </div>
      </div>

      {error && <div className="pr-error">⚠ {error}</div>}

      {loading ? (
        <div className="card"><div className="card-body">Loading plagiarism report...</div></div>
      ) : !report ? (
        <div className="card"><div className="card-body">No report available yet. Click "Run Plagiarism Check".</div></div>
      ) : (
        <>
          <div className="pr-stats">
            <div className="pr-stat"><strong>{report.totalSubmissions}</strong><span>Submissions</span></div>
            <div className="pr-stat"><strong>{report.totalPairs}</strong><span>Total Pairs</span></div>
            <div className="pr-stat"><strong>{report.flaggedPairs}</strong><span>Flagged Pairs</span></div>
            <div className="pr-stat"><strong>{new Date(report.generatedAt).toLocaleString()}</strong><span>Last Generated</span></div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="pr-filter-row">
                <label htmlFor="sim-filter">Show links with similarity at least: {filterMinScore}%</label>
                <input
                  id="sim-filter"
                  type="range"
                  min={0}
                  max={100}
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(Number(e.target.value))}
                />
              </div>

              <div className="pr-graph-wrap">
                <svg viewBox="0 0 900 520" className="pr-graph">
                  {filteredPairs.map((pair, index) => {
                    const ai = nodes.findIndex((n) => n.id === pair.student_a.id);
                    const bi = nodes.findIndex((n) => n.id === pair.student_b.id);
                    if (ai < 0 || bi < 0) return null;
                    const a = nodePosition(ai, nodes.length, 900, 520);
                    const b = nodePosition(bi, nodes.length, 900, 520);
                    const width = Math.max(1, Math.min(6, (pair.similarity - filterMinScore + 1) / 6));
                    return (
                      <g key={`${pair.student_a.id}-${pair.student_b.id}-${index}`}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={pair.flagged ? "#dc2626" : "#6b7280"}
                          strokeWidth={width}
                          opacity={0.8}
                        />
                        <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} className="pr-edge-label">
                          {pair.similarity.toFixed(1)}%
                        </text>
                      </g>
                    );
                  })}

                  {nodes.map((node, index) => {
                    const pos = nodePosition(index, nodes.length, 900, 520);
                    return (
                      <g key={node.id}>
                        <circle cx={pos.x} cy={pos.y} r={24} fill={nodeColor(index)} />
                        <text x={pos.x} y={pos.y + 4} textAnchor="middle" className="pr-node-label">
                          {node.name.slice(0, 1).toUpperCase()}
                        </text>
                        <text x={pos.x} y={pos.y + 42} textAnchor="middle" className="pr-node-name">
                          {node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-16">Filtered Pairs ({filteredPairs.length})</h3>
              {filteredPairs.length === 0 ? (
                <p>No student pair meets the selected filter.</p>
              ) : (
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th>Student A</th>
                        <th>Student B</th>
                        <th>Similarity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPairs.map((pair, index) => (
                        <tr key={`${pair.student_a.id}-${pair.student_b.id}-${index}`}>
                          <td>{pair.student_a.name}</td>
                          <td>{pair.student_b.name}</td>
                          <td>{pair.similarity.toFixed(2)}%</td>
                          <td>
                            <span className={`badge ${pair.flagged ? "badge-warning" : "badge-neutral"}`}>
                              {pair.flagged ? "Flagged" : "Normal"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
