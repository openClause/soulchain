"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colors = void 0;
exports.printLogo = printLogo;
exports.printHeader = printHeader;
exports.success = success;
exports.error = error;
exports.warn = warn;
exports.info = info;
exports.dim = dim;
exports.highlight = highlight;
exports.progressBar = progressBar;
const chalk_1 = __importDefault(require("chalk"));
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
function printLogo() {
    console.log('');
    for (let i = 0; i < LOGO_LINES.length; i++) {
        console.log(chalk_1.default.hex(GRADIENT[i])(LOGO_LINES[i]));
    }
    console.log('');
    console.log(chalk_1.default.cyan.dim('  🔗 Sovereign AI Identity'));
    console.log(chalk_1.default.gray(`  v${VERSION}`));
    console.log('');
}
function printHeader() {
    console.log(chalk_1.default.hex('#9B59B6')(`  🔗 SoulChain v${VERSION}`));
    console.log('');
}
function success(msg) {
    return chalk_1.default.hex('#2ECC71')(`✅ ${msg}`);
}
function error(msg) {
    return chalk_1.default.hex('#E74C3C')(`❌ ${msg}`);
}
function warn(msg) {
    return chalk_1.default.hex('#F39C12')(`⚠️  ${msg}`);
}
function info(msg) {
    return chalk_1.default.hex('#00BCD4')(`🔗 ${msg}`);
}
function dim(msg) {
    return chalk_1.default.gray(msg);
}
function highlight(msg) {
    return chalk_1.default.hex('#9B59B6').bold(msg);
}
function progressBar(current, total, width = 16) {
    const ratio = Math.min(current / total, 1);
    const filled = Math.round(ratio * width);
    const empty = width - filled;
    const bar = chalk_1.default.hex('#9B59B6')('█'.repeat(filled)) + chalk_1.default.gray('░'.repeat(empty));
    return bar;
}
// Color helpers for inline use
exports.colors = {
    purple: (s) => chalk_1.default.hex('#9B59B6')(s),
    green: (s) => chalk_1.default.hex('#2ECC71')(s),
    red: (s) => chalk_1.default.hex('#E74C3C')(s),
    yellow: (s) => chalk_1.default.hex('#F39C12')(s),
    cyan: (s) => chalk_1.default.hex('#00BCD4')(s),
    dim: (s) => chalk_1.default.gray(s),
    bold: (s) => chalk_1.default.bold(s),
};
