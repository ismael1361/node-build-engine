import { CompilerOptions } from "typescript";
export interface TSConfigContent {
    files?: string[];
    compilerOptions: CompilerOptions;
    compileOnSave?: boolean;
    include?: string[];
    exclude?: string[];
    browser?: Record<string, string>;
    browserify?: Partial<{
        entries: string | string[];
        standalone: string;
        ignore: string[];
        insertGlobals: boolean;
        detectGlobals: boolean;
        ignoreMissing: boolean;
        debug: boolean;
        extensions: string[];
        noParse: string[];
        externalRequireName: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map