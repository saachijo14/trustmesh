const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // Keep default error message
    }

    throw new Error(message);
  }

  return response.json();
}

/* ---------------- Dashboard ---------------- */

export const getDashboard = () =>
  request("/dashboard");

/* ---------------- Alerts ---------------- */

export const getAlerts = (params?: {
  status?: string;
  risk_tier?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  if (params?.risk_tier) {
    searchParams.set("risk_tier", params.risk_tier);
  }

  const query = searchParams.toString();

  return request(`/alerts${query ? `?${query}` : ""}`);
};

export const getAlert = (alertId: string) =>
  request(`/alerts/${alertId}`);

export const takeAlertAction = (
  alertId: string,
  action: string,
  analystId: string,
  notes = ""
) =>
  request(`/alerts/${alertId}/action`, {
    method: "POST",
    body: JSON.stringify({
      action,
      analyst_id: analystId,
      notes,
    }),
  });

/* ---------------- Rings ---------------- */

export const getRings = () =>
  request("/rings");

export const getRing = (ringId: string) =>
  request(`/rings/${ringId}`);

/* ---------------- TrustPass ---------------- */

export const getTrustPasses = () =>
  request("/trustpasses");

export const getCustomerTrustPasses = (customerId: string) =>
  request(`/trustpasses/customer/${customerId}`);

export const getTrustPass = (trustpassId: string) =>
  request(`/trustpasses/${trustpassId}`);

/* ---------------- Policies ---------------- */

export const getPolicy = () =>
  request("/policies");

export const updatePolicy = (config: unknown) =>
  request("/policies", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });

export const evaluatePolicy = (
  customerId: string,
  orderAmount: number
) =>
  request("/policies/evaluate", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      order_amount: orderAmount,
    }),
  });

/* ---------------- Metrics ---------------- */

export const getMetrics = () =>
  request("/metrics");