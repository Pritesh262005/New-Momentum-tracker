const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const writeFile = (filePath, content) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
};

const runNode = ({ cwd, args, timeoutMs }) => new Promise((resolve) => {
  const child = spawn(process.execPath, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=64`.trim()
    }
  });

  let stdout = '';
  let stderr = '';

  const timer = setTimeout(() => {
    child.kill('SIGKILL');
  }, timeoutMs);

  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  child.on('close', (code, signal) => {
    clearTimeout(timer);
    resolve({ code, signal, stdout, stderr });
  });
});

/**
 * Runs CODE_JS submissions as a function `functionName(input)` returning output.
 * WARNING: running untrusted code is risky; this uses a separate process + timeout but is not a perfect sandbox.
 */
const runCodeJsAutograde = async ({
  code,
  tests,
  functionName = 'solve',
  timeoutMs = 3000
}) => {
  const enabled = String(process.env.CODE_AUTOGRADE_ENABLED || 'false').toLowerCase() === 'true';
  const ackRisk = String(process.env.CODE_AUTOGRADE_ACK_RISK || 'false').toLowerCase() === 'true';
  if (!enabled || !ackRisk) {
    return {
      status: 'NOT_RUN',
      ranAt: null,
      functionName,
      totalTests: Array.isArray(tests) ? tests.length : 0,
      passedTests: 0,
      percentage: null,
      summary: !enabled
        ? 'Autograde disabled by server config'
        : 'Autograde requires CODE_AUTOGRADE_ACK_RISK=true',
      results: []
    };
  }

  const testRows = (Array.isArray(tests) ? tests : [])
    .slice(0, 50)
    .map((t, i) => ({
      index: i,
      input: String(t?.input ?? ''),
      expected: String(t?.expected ?? '')
    }));

  const workDir = path.join(os.tmpdir(), 'almts-autograde', `${Date.now()}_${Math.random().toString(16).slice(2)}`);
  ensureDir(workDir);

  const studentPath = path.join(workDir, 'student.js');
  const testsPath = path.join(workDir, 'tests.json');
  const runnerPath = path.join(workDir, 'runner.js');

  writeFile(studentPath, String(code || ''));
  writeFile(testsPath, JSON.stringify({ functionName, tests: testRows }, null, 2));
  writeFile(runnerPath, `
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync('./tests.json', 'utf8'));
const mod = require('./student.js');
const fnName = payload.functionName || 'solve';
const fn = (mod && mod[fnName]) || mod;
if (typeof fn !== 'function') {
  console.log(JSON.stringify({ ok:false, error:\`Export a function or module.exports.\${fnName} = function(input) { ... }\` }));
  process.exit(0);
}
const results = [];
for (const t of (payload.tests || [])) {
  let actual = null;
  let passed = false;
  try {
    const out = fn(String(t.input ?? ''));
    actual = (out && typeof out.then === 'function') ? await out : out;
    actual = actual === null || actual === undefined ? '' : String(actual);
    const a = actual.trim();
    const e = String(t.expected ?? '').trim();
    passed = a === e;
  } catch (e) {
    actual = \`ERROR: \${e?.message || e}\`;
    passed = false;
  }
  results.push({ index:t.index, input:t.input, expected:t.expected, actual, passed });
}
const passedTests = results.filter(r=>r.passed).length;
console.log(JSON.stringify({ ok:true, totalTests:results.length, passedTests, results }));
`.trim());

  const ranAt = new Date();
  const proc = await runNode({
    cwd: workDir,
    args: ['runner.js'],
    timeoutMs: Math.max(500, Math.min(15000, Number(timeoutMs) || 3000))
  });

  const outJson = safeJsonParse((proc.stdout || '').trim().split('\n').slice(-1)[0] || '');
  if (!outJson) {
    return {
      status: 'ERROR',
      ranAt,
      functionName,
      totalTests: testRows.length,
      passedTests: 0,
      percentage: 0,
      summary: 'Autograde failed to parse output',
      results: []
    };
  }

  if (!outJson.ok) {
    return {
      status: 'ERROR',
      ranAt,
      functionName,
      totalTests: testRows.length,
      passedTests: 0,
      percentage: 0,
      summary: outJson.error || 'Autograde error',
      results: []
    };
  }

  const totalTests = Number(outJson.totalTests || 0);
  const passedTests = Number(outJson.passedTests || 0);
  const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 10000) / 100 : 0;
  const results = Array.isArray(outJson.results) ? outJson.results.slice(0, 50) : [];
  const status = totalTests > 0 && passedTests === totalTests ? 'PASSED' : 'FAILED';

  return {
    status,
    ranAt,
    functionName,
    totalTests,
    passedTests,
    percentage,
    summary: status === 'PASSED' ? 'All tests passed' : `${passedTests}/${totalTests} tests passed`,
    results
  };
};

module.exports = { runCodeJsAutograde };
