type ApiEnvelope<T> =
	| { success: true; data: T }
	| { success: false; error: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: {
			...(init?.body ? { "Content-Type": "application/json" } : {}),
			...init?.headers,
		},
	});
	const payload = (await response.json()) as ApiEnvelope<T>;
	if (!response.ok || !payload.success) {
		throw new Error(
			"error" in payload ? payload.error : `HTTP ${response.status}`,
		);
	}
	return payload.data;
}

export const api = {
	get: <T>(url: string) => request<T>(url),
	post: <T>(url: string, body?: unknown) =>
		request<T>(url, {
			method: "POST",
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
};
