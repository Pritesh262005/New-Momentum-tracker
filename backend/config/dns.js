const dns = require('dns');

function configureDns() {
  const raw = process.env.DNS_SERVERS || process.env.NODE_DNS_SERVERS || '';
  const servers = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }

  return servers;
}

module.exports = configureDns;

