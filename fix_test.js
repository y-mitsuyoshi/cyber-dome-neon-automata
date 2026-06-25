const fs = require('fs');

const path = 'frontend/src/components/BattleArena.test.tsx';
let code = fs.readFileSync(path, 'utf8');

// I accidentally put the new test outside the describe block
code = code.replace('});\n\n  it(\'renders two deck labels for both players', '  it(\'renders two deck labels for both players');
code += '});\n';

fs.writeFileSync(path, code);
