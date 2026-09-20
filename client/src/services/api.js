const API_BASE_URL = 'http://localhost:5000/api';

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

export async function loginUser(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    return parseResponse(response);
}

export async function getClients() {
    const response = await fetch(`${API_BASE_URL}/clients`);
    return parseResponse(response);
}

export async function fetchJson(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return parseResponse(response);
}

export async function postJson(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    return parseResponse(response);
}

export async function putJson(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    return parseResponse(response);
}

export async function deleteJson(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
    });

    return parseResponse(response);
}