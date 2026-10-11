import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json()); // JSON body parser
app.use(express.static(path.join(__dirname, 'public'))); // Static files

// API Routes
app.use('/api/auth', (req, res) => {
  res.json({ message: 'Auth endpoint ready' });
});

app.use('/api/scan', (req, res) => {
  res.json({ message: 'Scan endpoint ready' });
});

app.use('/api/nutrition', (req, res) => {
  res.json({ message: 'Nutrition database ready' });
});

app.use('/api/user', (req, res) => {
  res.json({ message: 'User profile endpoint ready' });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'Login.html'));
});

app.get('/scanner', (req, res) => {
  res.sendFile(path.join(__dirname, 'Scanner.html'));
});

app.get('/analysis', (req, res) => {
  res.sendFile(path.join(__dirname, 'Analysis.html'));
});

app.get('/explanation', (req, res) => {
  res.sendFile(path.join(__dirname, 'Explanation.html'));
});

app.get('/user-profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'User.html'));
});

app.get('/code', (req, res) => {
  res.sendFile(path.join(__dirname, 'code.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 VERIDIS NutriScan Server running on http://localhost:${PORT}`);
  console.log(`📊 API Base: http://localhost:${PORT}/api`);
  console.log(`🔐 Environment: ${process.env.REACT_APP_ENVIRONMENT || 'development'}`);
});
