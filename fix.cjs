const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the greedy replacements
content = content.replace(/hover:bg-slate-50 dark:hover:bg-slate-800\/50 dark:bg-slate-950/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/50');
content = content.replace(/hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');
content = content.replace(/bg-slate-100\/50 dark:bg-slate-800\/50 dark:bg-slate-800/g, 'bg-slate-100/50 dark:bg-slate-800/50');
content = content.replace(/border-slate-100 dark:border-slate-800\/60 dark:border-slate-800\/60/g, 'border-slate-100 dark:border-slate-800/60');
content = content.replace(/hover:bg-slate-50 dark:hover:bg-slate-800\/50 dark:bg-slate-950/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/50');

fs.writeFileSync('src/App.tsx', content);
