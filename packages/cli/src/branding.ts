import chalk from 'chalk';

const VERSION = '0.1.0';

const LOGO_LINES = [
  '  ███████╗ ██████╗ ██╗   ██╗██╗      ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗',
  '  ██╔════╝██╔═══██╗██║   ██║██║     ██╔════╝██║  ██║██╔══██╗██║████╗  ██║',
  '  ███████╗██║   ██║██║   ██║██║     ██║     ███████║███████║██║██╔██╗ ██║',
  '  ╚════██║██║   ██║██║   ██║██║     ██║     ██╔══██║██╔══██║██║██║╚██╗██║',
  '  ███████║╚██████╔╝╚██████╔╝███████╗╚██████╗██║  ██║██║  ██║██║██║ ╚████║',
  '  ╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝',
];

// Purple gradient from lighter to deeper
const GRADIENT = [
  '#C39BD3', // lightest violet
  '#BB8FCE',
  '#AF7AC5',
  '#9B59B6',
  '#8E44AD',
  '#7D3C98', // deepest purple
];

export function printLogo(): void {
  console.log('');
  for (let i = 0; i < LOGO_LINES.length; i++) {
    console.log(chalk.hex(GRADIENT[i])(LOGO_LINES[i]));
  }
  console.log('');
  console.log(chalk.cyan.dim('  🔗 Sovereign AI Identity'));
  console.log(chalk.gray(`  v${VERSION}`));
  console.log('');
}

export function printHeader(): void {
  console.log(chalk.hex('#9B59B6')(`  🔗 SoulChain v${VERSION}`));
  console.log('');
}

export function success(msg: string): string {
  return chalk.hex('#2ECC71')(`✅ ${msg}`);
}

export function error(msg: string): string {
  return chalk.hex('#E74C3C')(`❌ ${msg}`);
}

export function warn(msg: string): string {
  return chalk.hex('#F39C12')(`⚠️  ${msg}`);
}

export function info(msg: string): string {
  return chalk.hex('#00BCD4')(`🔗 ${msg}`);
}

export function dim(msg: string): string {
  return chalk.gray(msg);
}

export function highlight(msg: string): string {
  return chalk.hex('#9B59B6').bold(msg);
}

export function progressBar(current: number, total: number, width: number = 16): string {
  const ratio = Math.min(current / total, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const bar = chalk.hex('#9B59B6')('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return bar;
}

// Color helpers for inline use
export const colors = {
  purple: (s: string) => chalk.hex('#9B59B6')(s),
  green: (s: string) => chalk.hex('#2ECC71')(s),
  red: (s: string) => chalk.hex('#E74C3C')(s),
  yellow: (s: string) => chalk.hex('#F39C12')(s),
  cyan: (s: string) => chalk.hex('#00BCD4')(s),
  dim: (s: string) => chalk.gray(s),
  bold: (s: string) => chalk.bold(s),
};
