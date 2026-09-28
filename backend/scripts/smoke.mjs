// End-to-end API smoke test. Requires a running backend and an existing admin account.
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... node scripts/smoke.mjs
const BASE = process.env.API_URL ?? 'http://localhost:4000/api';
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`); if (!cond) failed++; };

async function call(method, path, { token, json, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(json && { 'Content-Type': 'application/json' }) },
    body: json ? JSON.stringify(json) : form,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const minimalPdf = (pages = 2) => {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(' ')}] /Count ${pages} >>`,
    ...Array.from({ length: pages }, () => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>')];
  let out = '%PDF-1.4\n'; objs.forEach((o, i) => { out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  return Buffer.from(out + 'trailer\n<< /Root 1 0 R >>\n%%EOF');
};
const pdfForm = (name, buf = minimalPdf(), type = 'application/pdf', extra = {}) => {
  const f = new FormData(); f.append('file', new Blob([buf], { type }), name);
  for (const [k, v] of Object.entries(extra)) f.append(k, v); return f;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- auth
const email = `student${Date.now()}@example.com`;
let r = await call('POST', '/auth/register', { json: { name: 'Test Student', email, password: 'password123' } });
check('register -> 201 with token, role=user', r.status === 201 && r.body.data.token && r.body.data.user.role === 'user', JSON.stringify(r.body));
const userToken = r.body.data?.token;
r = await call('POST', '/auth/register', { json: { name: 'Dup', email, password: 'password123' } });
check('duplicate email -> 409 EMAIL_TAKEN', r.status === 409 && r.body.error.code === 'EMAIL_TAKEN');
r = await call('POST', '/auth/register', { json: { name: 'x', email: 'bad', password: 'short' } });
check('invalid register -> 400 VALIDATION_ERROR', r.status === 400 && r.body.error.code === 'VALIDATION_ERROR');
r = await call('POST', '/auth/login', { json: { email, password: 'wrongpass' } });
check('wrong password -> 401', r.status === 401 && r.body.error.code === 'INVALID_CREDENTIALS');
r = await call('POST', '/auth/login', { json: { email, password: 'password123' } });
check('login ok', r.status === 200 && !!r.body.data.token);
r = await call('GET', '/auth/me', { token: userToken });
check('me returns current user (no password hash)', r.status === 200 && r.body.data.user.email === email && !('passwordHash' in r.body.data.user));
r = await call('GET', '/auth/me');
check('me without token -> 401', r.status === 401);
r = await call('POST', '/auth/logout', { token: userToken });
check('logout -> 200', r.status === 200);

// ---- admin
r = await call('POST', '/auth/login', { json: ADMIN });
check('admin login', r.status === 200 && r.body.data.user.role === 'admin', JSON.stringify(r.body));
const adminToken = r.body.data?.token;
r = await call('GET', '/admin/documents', { token: userToken });
check('user cannot list admin documents -> 403', r.status === 403);
r = await call('POST', '/admin/documents', { token: userToken, form: pdfForm('x.pdf') });
check('user cannot upload -> 403', r.status === 403);
r = await call('POST', '/admin/documents', { token: adminToken, form: pdfForm('notes.txt', Buffer.from('hello'), 'text/plain') });
check('non-PDF rejected -> 415', r.status === 415 && r.body.error.code === 'INVALID_FILE_TYPE');
r = await call('POST', '/admin/documents', { token: adminToken, form: pdfForm('fake.pdf', Buffer.from('not a pdf at all')) });
check('fake PDF (bad magic bytes) rejected -> 415', r.status === 415);
r = await call('POST', '/admin/documents', { token: adminToken, form: pdfForm('biology.pdf', minimalPdf(3), 'application/pdf', { title: 'Biology Chapter 5', subject: 'Biology' }) });
check('upload -> 202, status processing', r.status === 202 && r.body.data.status === 'processing' && r.body.data.subject === 'Biology', JSON.stringify(r.body));
const docId = r.body.data?.id;
r = await call('GET', `/admin/documents/${docId}`, { token: adminToken });
check('document visible while processing', r.status === 200 && r.body.data.status === 'processing');
await sleep(3800);
r = await call('GET', `/admin/documents/${docId}`, { token: adminToken });
check('document becomes ready with page count', r.body.data.status === 'ready' && r.body.data.pageCount === 3, JSON.stringify(r.body.data));
r = await call('POST', '/admin/documents', { token: adminToken, form: pdfForm('will-fail.pdf') });
const failId = r.body.data?.id; await sleep(3800);
r = await call('GET', `/admin/documents/${failId}`, { token: adminToken });
check('failed ingestion -> status failed + error message', r.body.data.status === 'failed' && !!r.body.data.errorMessage);
r = await call('GET', '/admin/documents/not-a-uuid', { token: adminToken });
check('bad id -> 400', r.status === 400);
r = await call('GET', '/admin/documents/00000000-0000-0000-0000-000000000000', { token: adminToken });
check('unknown id -> 404 DOCUMENT_NOT_FOUND', r.status === 404 && r.body.error.code === 'DOCUMENT_NOT_FOUND');

// ---- chat
r = await call('POST', '/chat', { token: userToken, json: { conversationId: null, question: 'What is actinomorphic symmetry?' } });
check('chat creates conversation + mock answer', r.status === 200 && r.body.data.message.content.startsWith('[MOCK RAG RESPONSE]') && r.body.data.conversationId, JSON.stringify(r.body));
check('chat returns sources array (mock sample points at ready doc)', Array.isArray(r.body.data.sources) && r.body.data.sources[0]?.documentId === docId, JSON.stringify(r.body.data.sources));
const convId = r.body.data.conversationId;
r = await call('POST', '/chat', { token: userToken, json: { conversationId: convId, question: 'And zygomorphic?' } });
check('follow-up in same conversation', r.status === 200 && r.body.data.conversationId === convId);
r = await call('POST', '/chat', { token: userToken, json: { question: '   ' } });
check('empty question -> 400', r.status === 400);
r = await call('GET', '/conversations', { token: userToken });
check('conversation history lists chat with question as title', r.body.data.length === 1 && r.body.data[0].title === 'What is actinomorphic symmetry?');
r = await call('GET', `/conversations/${convId}/messages`, { token: userToken });
check('4 messages stored, assistant messages keep sources', r.body.data.length === 4 && r.body.data[1].role === 'assistant' && r.body.data[1].sources.length === 1, JSON.stringify(r.body.data.map((m) => m.role)));
r = await call('POST', '/conversations', { token: userToken, json: {} });
check('create empty conversation -> 201', r.status === 201 && r.body.data.title === 'New chat');

// ---- ownership
const other = await call('POST', '/auth/register', { json: { name: 'Other', email: `other${Date.now()}@example.com`, password: 'password123' } });
const otherToken = other.body.data.token;
r = await call('GET', `/conversations/${convId}`, { token: otherToken });
check("other user cannot read my conversation -> 404", r.status === 404);
r = await call('GET', `/conversations/${convId}/messages`, { token: otherToken });
check("other user cannot read my messages -> 404", r.status === 404);
r = await call('DELETE', `/conversations/${convId}`, { token: otherToken });
check("other user cannot delete my conversation -> 404", r.status === 404);
r = await call('POST', '/chat', { token: otherToken, json: { conversationId: convId, question: 'hi' } });
check("other user cannot chat in my conversation -> 404", r.status === 404);
r = await call('DELETE', `/conversations/${convId}`, { token: userToken });
check('owner deletes conversation', r.status === 200);
r = await call('GET', `/conversations/${convId}`, { token: userToken });
check('deleted conversation -> 404', r.status === 404);

// ---- delete documents
r = await call('DELETE', `/admin/documents/${docId}`, { token: adminToken });
check('admin deletes document', r.status === 200);
r = await call('GET', `/admin/documents/${docId}`, { token: adminToken });
check('deleted document -> 404', r.status === 404);
r = await call('DELETE', `/admin/documents/${failId}`, { token: adminToken });
check('failed document can be deleted', r.status === 200);
r = await call('GET', '/nope');
check('unknown route -> 404 JSON envelope', r.status === 404 && r.body.success === false);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
