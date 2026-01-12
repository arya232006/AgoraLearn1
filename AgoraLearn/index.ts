// ...existing code...
require('dotenv').config();
//console.log('ENV DEBUG:', process.env);
//console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
//console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
// Cloud Run populates PORT (usually 8080). We must listen on it.
// We also bind to 0.0.0.0 explicitly to ensure we accept outside connections.
const PORT = process.env.PORT || 3000;

// Helper to import compiled handler
function importHandler(handlerPath) {
  // For CommonJS compiled output
  return require(handlerPath).default;
}

// Map API routes to handlers
app.use(express.json());

// Example routes (add more as needed)
app.all('/api/converse', importHandler(path.join(__dirname, 'api', 'converse.js')));
app.all('/api/health', importHandler(path.join(__dirname, 'api', 'health.js')));
app.all('/api/upload', importHandler(path.join(__dirname, 'api', 'upload.js')));
app.all('/api/upload-file', importHandler(path.join(__dirname, 'api', 'upload-file.js')));
app.all('/api/upload-binary', importHandler(path.join(__dirname, 'api', 'upload-binary.js')));
app.all('/api/voice/token-debug', importHandler(path.join(__dirname, 'api', 'voice', 'token-debug.js')));
app.all('/api/voice-query', importHandler(path.join(__dirname, 'api', 'voice-query.js')));
// Extension proxy endpoints
app.all('/api/extension/ingest', importHandler(path.join(__dirname, 'api', 'extension', 'ingest.js')));
app.all('/api/extension/query', importHandler(path.join(__dirname, 'api', 'extension', 'query.js')));
// Upload doc route used by extension proxy
app.all('/api/upload-doc', importHandler(path.join(__dirname, 'api', 'upload-doc.js')));
// New feature routes
app.all('/api/handle-query', importHandler(path.join(__dirname, 'api', 'handle-query.js')));
app.all('/api/extract-tables', importHandler(path.join(__dirname, 'api', 'extract-tables.js')));
app.all('/api/analyze-chart', importHandler(path.join(__dirname, 'api', 'analyze-chart.js')));
app.all('/api/summarize', importHandler(path.join(__dirname, 'api', 'summarize.js')));
// Add other routes here following the same pattern

app.get('/', (_req, res) => {
  res.send('AgoraLearn Express server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
