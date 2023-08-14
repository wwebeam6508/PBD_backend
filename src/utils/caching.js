import NodeCache from "node-cache";
const cache = new NodeCache();

export default {
  getFromCache: (key) => cache.get(key),
  setCache: (key, data, ttl) => cache.set(key, data, ttl),
};
