const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
  'bg-slate-50': 'bg-slate-50 dark:bg-slate-950',
  'bg-slate-100/50': 'bg-slate-100/50 dark:bg-slate-800/50',
  'bg-slate-100': 'bg-slate-100 dark:bg-slate-800',
  'text-slate-900': 'text-slate-900 dark:text-slate-50',
  'text-slate-800': 'text-slate-800 dark:text-slate-200',
  'text-slate-700': 'text-slate-700 dark:text-slate-300',
  'text-slate-600': 'text-slate-600 dark:text-slate-400',
  'text-slate-500': 'text-slate-500 dark:text-slate-400',
  'text-slate-400': 'text-slate-400 dark:text-slate-500',
  'bg-white': 'bg-white dark:bg-slate-900',
  'border-slate-300': 'border-slate-300 dark:border-slate-700',
  'border-slate-200': 'border-slate-200 dark:border-slate-800',
  'border-slate-100': 'border-slate-100 dark:border-slate-800/60',
  'hover:bg-slate-50': 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
  'hover:bg-slate-100': 'hover:bg-slate-100 dark:hover:bg-slate-800',
  'hover:border-slate-100': 'hover:border-slate-100 dark:hover:border-slate-700',
  'bg-indigo-50/50': 'bg-indigo-50/50 dark:bg-indigo-900/20',
  'bg-indigo-50': 'bg-indigo-50 dark:bg-indigo-900/40',
  'bg-indigo-100': 'bg-indigo-100 dark:bg-indigo-900/60',
  'text-indigo-700': 'text-indigo-700 dark:text-indigo-400',
  'text-indigo-600': 'text-indigo-600 dark:text-indigo-400',
  'text-indigo-500': 'text-indigo-500 dark:text-indigo-400',
  'border-indigo-100': 'border-indigo-100 dark:border-indigo-900/50',
  'border-indigo-200': 'border-indigo-200 dark:border-indigo-800',
  'border-indigo-300': 'border-indigo-300 dark:border-indigo-700',
  'bg-emerald-50': 'bg-emerald-50 dark:bg-emerald-900/20',
  'text-emerald-600': 'text-emerald-600 dark:text-emerald-400',
  'border-emerald-100': 'border-emerald-100 dark:border-emerald-900/50',
  'bg-rose-50': 'bg-rose-50 dark:bg-rose-900/20',
  'text-rose-700': 'text-rose-700 dark:text-rose-400',
  'text-rose-600': 'text-rose-600 dark:text-rose-400',
  'border-rose-200': 'border-rose-200 dark:border-rose-900/50',
  'text-rose-500': 'text-rose-500 dark:text-rose-400',
  'bg-slate-200/50': 'bg-slate-200/50 dark:bg-slate-700/50'
};

for (const [key, val] of Object.entries(replacements)) {
  const regex = new RegExp(`(?<!dark:)(?<!-|/)(?<![0-9]|-)${key.replace(/([.\\/])/g, '\\$1')}(?![a-zA-Z0-9/-])`, 'g');
  content = content.replace(regex, val);
}

fs.writeFileSync('src/App.tsx', content);
