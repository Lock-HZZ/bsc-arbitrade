import fs from 'fs';
import path from 'path';

async function main() {
  const buildInfoDir = path.join(__dirname, '..', 'artifacts', 'build-info');
  const outputDir = path.join(__dirname, '..', 'deployments', 'solcInputs');

  if (!fs.existsSync(buildInfoDir)) {
    throw new Error(`build-info directory not found: ${buildInfoDir}. Please run "npx hardhat compile" first.`);
  }

  const files = fs.readdirSync(buildInfoDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('No build-info json files found. Please run "npx hardhat compile" first.');
  }

  // 尝试找到包含 Staking.sol 的 build-info
  let chosen: any | null = null;
  for (const file of files) {
    const fullPath = path.join(buildInfoDir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    try {
      const json = JSON.parse(raw);
      const input = json.input;
      if (input && input.sources && input.sources['contracts/Staking.sol']) {
        chosen = input;
        break;
      }
    } catch {
      // ignore parse error
    }
  }

  if (!chosen) {
    throw new Error('Cannot find build-info that contains "contracts/Staking.sol". Make sure it is compiled.');
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outPath = path.join(outputDir, 'Staking.json');
  fs.writeFileSync(outPath, JSON.stringify(chosen, null, 2));

  console.log(`✅ Solc input for Staking exported to: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


