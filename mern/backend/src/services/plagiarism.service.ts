import axios from "axios";
import Deliverable from "../models/deliverable.model";
import * as SubmissionService from "./submission.service";

type PairEntry = {
  student_a: { id: string; name: string };
  student_b: { id: string; name: string };
  similarity: number;
  flagged: boolean;
};

type PlagiarismReport = {
  status: string;
  message?: string;
  deliverable_id?: string;
  total_submissions?: number;
  total_pairs?: number;
  flagged_pairs?: number;
  threshold_percent?: number;
  pairs?: PairEntry[];
};

function getAiBaseUrl(): string {
  return process.env.AI_BACKEND_BASE_URL || "http://127.0.0.1:8000";
}

function getCheckEndpoint(): string {
  return process.env.AI_PLAGIARISM_CHECK_ENDPOINT || "/plagiarism/check";
}

function getDefaultThresholdPercent(): number {
  const raw = Number(process.env.PLAGIARISM_DEFAULT_THRESHOLD_PERCENT || 70);
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 70;
  return raw;
}

function normalizeName(name?: string | null, fallback?: string): string {
  const value = (name || fallback || "").trim();
  return value || "Unknown Student";
}

export async function runPlagiarismCheckForDeliverable(
  deliverableId: string,
  thresholdPercent?: number
): Promise<PlagiarismReport> {
  const submissions = await SubmissionService.getSubmissionsByDeliverable(deliverableId);
  const validSubs = submissions.filter((sub) => sub.attachments?.[0]?.url);

  const threshold = Number.isFinite(thresholdPercent)
    ? Math.max(0, Math.min(100, Number(thresholdPercent)))
    : getDefaultThresholdPercent();

  const payload = {
    deliverable_id: deliverableId,
    threshold_percent: threshold,
    submissions: validSubs.map((sub) => {
      const studentObj = sub.student as unknown as { _id?: string; name?: string; email?: string };
      return {
        student_id: String(studentObj?._id || sub.student || ""),
        student_name: normalizeName(studentObj?.name, studentObj?.email),
        file_url: sub.attachments[0].url,
      };
    }),
  };

  if (payload.submissions.length < 2) {
    return {
      status: "error",
      message: "Need at least 2 submitted files to run plagiarism check",
      deliverable_id: deliverableId,
      total_submissions: payload.submissions.length,
      total_pairs: 0,
      flagged_pairs: 0,
      threshold_percent: threshold,
      pairs: [],
    };
  }

  const url = `${getAiBaseUrl().replace(/\/+$/, "")}${getCheckEndpoint()}`;
  let report: PlagiarismReport;
  try {
    const aiResponse = await axios.post<PlagiarismReport>(url, payload, {
      timeout: 120000,
    });
    report = aiResponse.data;
  } catch (error: any) {
    const statusCode = error?.response?.status;
    const detail = error?.response?.data?.detail || error?.message || "AI backend request failed";
    return {
      status: "error",
      message: `AI backend error${statusCode ? ` (${statusCode})` : ""}: ${detail}`,
      deliverable_id: deliverableId,
      threshold_percent: threshold,
      pairs: [],
    };
  }

  if (report?.status !== "success") {
    return report;
  }

  await Deliverable.findByIdAndUpdate(deliverableId, {
    $set: {
      plagiarismLastCheckedAt: new Date(),
      plagiarismReport: {
        generatedAt: new Date(),
        thresholdPercent: Number(report.threshold_percent || threshold),
        totalSubmissions: Number(report.total_submissions || 0),
        totalPairs: Number(report.total_pairs || 0),
        flaggedPairs: Number(report.flagged_pairs || 0),
        pairs: Array.isArray(report.pairs) ? report.pairs : [],
      },
    },
  });

  return report;
}

export async function runAutomaticDeadlinePlagiarismChecks(): Promise<void> {
  const now = new Date();
  const dueDeliverables = await Deliverable.find({
    status: "published",
    deadline: { $lte: now },
    plagiarismAutoCheckedAt: { $exists: false },
  }).select("_id");

  for (const deliverable of dueDeliverables) {
    try {
      const report = await runPlagiarismCheckForDeliverable(String(deliverable._id));
      if (report?.status === "success") {
        await Deliverable.findByIdAndUpdate(deliverable._id, {
          $set: { plagiarismAutoCheckedAt: new Date() },
        });
      }
    } catch (error) {
      console.error("auto plagiarism check failed:", String(deliverable._id), error);
    }
  }
}
