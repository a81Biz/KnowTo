const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\DevOps\\Desarrollos\\KnowTo\\docs\\ceneval-audit';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const execOpts = { maxBuffer: 10 * 1024 * 1024 };

const queryDocs = `docker exec knowto-supabase-db psql -U postgres -d postgres -t -c "SELECT phase_id, title, content FROM documents WHERE project_id='71d993b0-6cb8-437b-adaf-a9560bdfb1f6';"`;
const outputDocs = execSync(queryDocs, execOpts).toString();

const docBlocks = outputDocs.split(/(?= F[0-9])/);
for (const block of docBlocks) {
  const match = block.match(/^\s*(F[A-Za-z0-9.]+)\s*\|\s*(.*?)\s*\|\s*([\s\S]*)/);
  if (match) {
    const phaseId = match[1].trim();
    const content = match[3].trim();
    fs.writeFileSync(path.join(outDir, `${phaseId}.md`), content);
  }
}

const queryF4 = `docker exec knowto-supabase-db psql -U postgres -d postgres -t -c "SELECT producto, documento_final, job_id, created_at FROM fase4_productos WHERE project_id='71d993b0-6cb8-437b-adaf-a9560bdfb1f6';"`;
const outputF4 = execSync(queryF4, execOpts).toString();

const f4Blocks = outputF4.split(/(?=\s+P[1-8]\s+\|)/);
for (const block of f4Blocks) {
  const match = block.match(/^\s*(P[1-8])\s*\|\s*([\s\S]*)/);
  if (match) {
    const prod = match[1].trim();
    const content = match[2].trim();
    fs.writeFileSync(path.join(outDir, `${prod}.md`), content);
  }
}

console.log("Exported documents to docs/ceneval-audit/");
