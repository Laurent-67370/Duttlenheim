// netlify/functions/api-playbad.js
// API Serverless pour l'application Soirée Playbad
// Opérations : GET, POST, PUT, DELETE sur Firebase Realtime Database

const https = require('https');

// ⚠️ REMPLACER PAR L'URL DE VOTRE FIREBASE
const FIREBASE_URL = 'playbad-duttlenheim-default-rtdb.europe-west1.firebasedatabase.app';

function firebaseRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: FIREBASE_URL,
            path: `${path}.json`,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch { resolve(body); }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // ── GET : récupérer tous les participants ──
        if (event.httpMethod === 'GET') {
            const data = await firebaseRequest('GET', '/participants');
            const list = data
                ? Object.values(data).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                : [];
            return { statusCode: 200, headers, body: JSON.stringify(list) };
        }

        // ── POST : ajouter un participant ──
        if (event.httpMethod === 'POST') {
            const { name } = JSON.parse(event.body);
            if (!name || !name.trim()) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nom requis' }) };
            }
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const participant = {
                id,
                name: name.trim(),
                createdAt: new Date().toISOString()
            };
            await firebaseRequest('PUT', `/participants/${id}`, participant);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id }) };
        }

        // ── PUT : modifier un participant ──
        if (event.httpMethod === 'PUT') {
            const { id, name } = JSON.parse(event.body);
            if (!id || !name || !name.trim()) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID et nom requis' }) };
            }
            await firebaseRequest('PATCH', `/participants/${id}`, { name: name.trim() });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id }) };
        }

        // ── DELETE : supprimer un participant ──
        if (event.httpMethod === 'DELETE') {
            const id = event.path.split('/').pop();
            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID requis' }) };
            }
            await firebaseRequest('DELETE', `/participants/${id}`);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, id }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

    } catch (err) {
        console.error('Erreur API Playbad:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur', details: err.message }) };
    }
};
