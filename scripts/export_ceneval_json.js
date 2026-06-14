const { execSync } = require('child_process');
const fs = require('fs');

const outF4 = execSync(`docker exec knowto-supabase-db psql -U postgres -d postgres -t -c "SELECT json_agg(json_build_object('producto', producto, 'documento_final', documento_final)) FROM fase4_productos WHERE project_id='71d993b0-6cb8-437b-adaf-a9560bdfb1f6';"`, { maxBuffer: 50 * 1024 * 1024 }).toString();

const dataF4 = JSON.parse(outF4.trim());
dataF4.forEach(d => {
  if (d.producto) fs.writeFileSync('docs/ceneval-audit/' + d.producto + '.md', d.documento_final || '');
});

const outDocs = execSync(`docker exec knowto-supabase-db psql -U postgres -d postgres -t -c "SELECT json_agg(json_build_object('phase_id', phase_id, 'content', content)) FROM documents WHERE project_id='71d993b0-6cb8-437b-adaf-a9560bdfb1f6';"`, { maxBuffer: 50 * 1024 * 1024 }).toString();

const dataDocs = JSON.parse(outDocs.trim());
dataDocs.forEach(d => {
  if (d.phase_id) fs.writeFileSync('docs/ceneval-audit/' + d.phase_id + '.md', d.content || '');
});
console.log('Exported all documents.');
