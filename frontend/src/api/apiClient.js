// src/api/apiClient.js
import axios from 'axios';

// This is the URL of your FastAPI backend
const API_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_URL,
});

export default apiClient;