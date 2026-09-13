import { spawnSync } from 'node:child_process'
const scripts = ['onboarding_qa', 'handwriting_qa', 'freehand_qa', 'random_qa', 'library_qa', 'import_security_qa', 'phone_qa', 'polish_qa', 'material_qa', 'readability_qa', 'fullscreen_qa', 'persistence_qa', 'writing_acceptance', 'chapel_qa', 'reference_picker_qa']
for (const script of scripts) {
  console.log(`\n--- ${script} ---`)
  const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], { stdio: 'inherit', env: process.env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(`\nPASS: ${scripts.length} active browser suites.`)
