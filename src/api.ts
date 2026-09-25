// API Client for RedCross Nexus
// The backend API is unauthenticated: requests carry no Authorization
// header and no token is stored. Error responses keep their generic message
// (404 for missing resources, 422 for validation, 5xx for server faults).

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// --- Types ---



export interface Report {
  id?: string;
  original_text: string;
  reporter: string;
  timestamp?: string;
  location?: string;
  incident?: string;
  evidence?: string[];
  source?: string;
  status?: string;
  needs?: string[];
  severity?: string;
  location_status?: string;
  affected_population?: number;
  infrastructure_status?: string;
  available_needs?: string[];
  vulnerability?: string[];
  time_sensitivity?: string;
  verification_status?: string;
}

export interface EvidenceItem {
  id: string;
  role: 'supports' | 'conflicts';
  author: string;
  time: string;
  text: string;
}

export interface TimelineItem {
  time: string;
  id: string;
  text: string;
  level: string;
}

export interface FusionCandidate {
  id: string;
  type: 'POSSIBLE_DUPLICATE' | 'POSSIBLE_CONFLICT';
  report_ids: string[];
  cluster_id: string;
  reason: string;
  similarity?: number;
  status: 'PENDING' | 'RESOLVED';
  resolution?: 'MERGED' | 'KEPT_SEPARATE' | 'DISMISSED';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface NeedCluster {
  id: string;
  need: string;
  location: string;
  status: 'REVIEW' | 'VERIFIED' | 'MONITOR' | 'REJECTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  affected: string;
  observations: number;
  sources: number;
  photos: number;
  conflicts: number;
  firstSeen: string;
  lastUpdate: string;
  consistent: boolean;
  summary: string;
  fusionReasons: string[];
  confidence: number;
  evidence: EvidenceItem[];
  timeline: TimelineItem[];
  conflict: { prev: string; latest: string } | null;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// --- Fetch Wrapper ---
async function request<T>(url: string | URL, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error('Network failure: Unable to reach backend API');
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.detail) {
        msg = Array.isArray(errData.detail)
          ? errData.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ')
          : errData.detail;
      }
    } catch (e) {
      // JSON parse failed
    }

    if (res.status === 404) {
      throw new Error(`Not Found (404). ${msg}`);
    } else if (res.status === 422) {
      throw new Error(`Validation Error (422): ${msg}`);
    } else if (res.status >= 500) {
      throw new Error(`Server Error (${res.status}): The backend encountered an unexpected problem.`);
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// --- API Methods ---

export const api = {
  // 1. Reports
  submitReport: (data: Partial<Report>): Promise<Report> => request<Report>(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  getReportStatus: (id: string): Promise<Report> => request<Report>(`${API_BASE_URL}/api/reports/${id}`),

  // 2. Clusters
  getClusters: (params?: Record<string, string | number>): Promise<PaginatedResponse<NeedCluster>> => {
    const url = new URL(`${API_BASE_URL}/api/clusters`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }
    return request<PaginatedResponse<NeedCluster>>(url.toString());
  },

  getClusterDetail: (id: string): Promise<NeedCluster> => request<NeedCluster>(`${API_BASE_URL}/api/clusters/${id}`),



  // 4. Fusion
  getFusionCandidates: (): Promise<FusionCandidate[]> => request<FusionCandidate[]>(`${API_BASE_URL}/api/fusion`),

  resolveFusionCandidate: (id: string, action: 'MERGED' | 'KEPT_SEPARATE' | 'DISMISSED'): Promise<FusionCandidate> =>
    request<FusionCandidate>(`${API_BASE_URL}/api/fusion/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }),
};
