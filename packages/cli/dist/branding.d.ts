export declare function printLogo(): void;
export declare function printHeader(): void;
export declare function success(msg: string): string;
export declare function error(msg: string): string;
export declare function warn(msg: string): string;
export declare function info(msg: string): string;
export declare function dim(msg: string): string;
export declare function highlight(msg: string): string;
export declare function progressBar(current: number, total: number, width?: number): string;
export declare const colors: {
    purple: (s: string) => string;
    green: (s: string) => string;
    red: (s: string) => string;
    yellow: (s: string) => string;
    cyan: (s: string) => string;
    dim: (s: string) => string;
    bold: (s: string) => string;
};
//# sourceMappingURL=branding.d.ts.map