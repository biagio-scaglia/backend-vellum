const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const config = require('../config');

const apiClient = axios.create({
  baseURL: config.baseUrl,
  timeout: 10000 // 10 secondi di timeout
});

// Configura i retry automatici con exponential backoff
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Riprova su errori di rete o 429 (Too Many Requests) o 5xx
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.response?.status === 429 ||
           (error.response?.status >= 500 && error.response?.status < 600);
  }
});

async function fetchSpells() {
  const resp = await apiClient.get('/spells');
  return resp.data.results;
}

async function fetchSpellDetails(index) {
  const resp = await apiClient.get(`/spells/${index}`);
  return resp.data;
}

async function fetchMonsters() {
  const resp = await apiClient.get('/monsters');
  return resp.data.results;
}

async function fetchMonsterDetails(index) {
  const resp = await apiClient.get(`/monsters/${index}`);
  return resp.data;
}

module.exports = {
  fetchSpells,
  fetchSpellDetails,
  fetchMonsters,
  fetchMonsterDetails
};
