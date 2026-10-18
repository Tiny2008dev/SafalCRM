const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000/api' : '');
if (!API_BASE_URL) throw new Error('REACT_APP_API_URL must be configured for production builds.');
let authToken = null;

export function setAuthToken(token) { authToken = token || null; }

function authHeaders(headers = {}) {
    return authToken ? { ...headers, Authorization: `Bearer ${authToken}` } : headers;
}

async function parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    }

    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `Request failed with status ${response.status}`);
    }

    throw new Error('Server returned a non-JSON response.');
}

function withApiFallback(promiseFactory, fallbackMessage = 'The CRM server is unreachable. Make sure the backend is running.') {
    return promiseFactory().catch((error) => {
        if (error instanceof TypeError || error?.name === 'TypeError') {
            throw new Error(fallbackMessage);
        }
        throw error;
    });
}

export async function loginUser(credentials) {
    return withApiFallback(async () => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                ...authHeaders({ 'Content-Type': 'application/json' }),
            },
            body: JSON.stringify(credentials),
        });

        const data = await parseResponse(response);
        setAuthToken(data.token);
        return data;
    }, `CRM login is unavailable. Check that the backend is running at ${API_BASE_URL} and allows requests from this website.`);
}

export async function getClients() {
    const response = await fetch(`${API_BASE_URL}/clients`, { headers: authHeaders() });
    return parseResponse(response);
}

export async function fetchJson(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers: authHeaders() });
    return parseResponse(response);
}

export async function postJson(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            ...authHeaders({ 'Content-Type': 'application/json' }),
        },
        body: JSON.stringify(data),
    });

    return parseResponse(response);
}

export async function putJson(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            ...authHeaders({ 'Content-Type': 'application/json' }),
        },
        body: JSON.stringify(data),
    });

    return parseResponse(response);
}

export async function patchJson(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
    });
    return parseResponse(response);
}

export async function deleteJson(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE', headers: authHeaders(),
    });

    return parseResponse(response);
}
