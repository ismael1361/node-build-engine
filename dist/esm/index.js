"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const typescript_1 = __importDefault(require("typescript"));
const glob = __importStar(require("glob"));
const browserify_1 = __importDefault(require("browserify"));
const terser_1 = __importDefault(require("terser"));
const tsconfig_path = path_1.default.join(process.cwd(), process.argv.slice(2)[0] ?? "tsconfig.json");
const root_path = path_1.default.dirname(tsconfig_path);
const dist_path = path_1.default.join(root_path, "dist");
const package_path = path_1.default.join(process.cwd(), process.argv.slice(2)[0] ?? "package.json");
if (!fs_extra_1.default.existsSync(tsconfig_path)) {
    throw new Error("tsconfig.json not found or not exists");
}
if (!fs_extra_1.default.existsSync(package_path)) {
    throw new Error("package.json not found or not exists");
}
if (fs_extra_1.default.existsSync(dist_path)) {
    fs_extra_1.default.removeSync(dist_path);
}
fs_extra_1.default.mkdirSync(dist_path);
const tsconfig = JSON.parse(fs_extra_1.default.readFileSync(tsconfig_path, "utf-8"));
const package_json = JSON.parse(fs_extra_1.default.readFileSync(package_path, "utf-8"));
const rootNames = tsconfig.files || [];
const includes = tsconfig.include || [];
const excludes = tsconfig.exclude || [];
function matchFiles(patterns, excludePatterns = []) {
    const files = [];
    patterns.forEach((pattern) => {
        const globFiles = glob.sync(pattern, {
            cwd: root_path,
            ignore: excludePatterns,
        });
        files.push(...globFiles);
    });
    return files;
}
// Obtém todos os arquivos incluídos com base no tsconfig.json
const allFiles = rootNames.concat(matchFiles(includes, excludes)).map((file) => path_1.default.join(root_path, file));
const allBrowserFiles = {};
const generateProgram = (type) => {
    let { compilerOptions = {}, browser = {}, browserify: browserifyOptions } = { ...tsconfig };
    const options = {
        noEmitOnError: true,
        noImplicitAny: true,
        target: type === "esm" ? typescript_1.default.ScriptTarget.ES2020 : typescript_1.default.ScriptTarget.ES2017,
        module: type === "esm" ? typescript_1.default.ModuleKind.ES2020 : typescript_1.default.ModuleKind.CommonJS,
        moduleResolution: typescript_1.default.ModuleResolutionKind.Node16,
        listEmittedFiles: false,
        sourceMap: true,
        pretty: true,
        declaration: type === "esm",
        declarationMap: type === "esm",
        skipLibCheck: false,
        strict: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        removeComments: false,
        rootDir: path_1.default.join(root_path, compilerOptions.rootDir ?? ""),
        outDir: path_1.default.join(dist_path, type),
        declarationDir: type === "esm" ? path_1.default.join(dist_path, "types") : undefined,
    };
    const host = typescript_1.default.createCompilerHost(options);
    const program = typescript_1.default.createProgram(allFiles, options, host);
    const result = program.emit();
    if (result.emitSkipped) {
        const errors = typescript_1.default.getPreEmitDiagnostics(program).concat(result.diagnostics);
        errors.forEach((diagnostic) => {
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
                const message = typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            }
            else {
                console.error(typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
            }
        });
        process.exit(1);
    }
    const browserFiles = {};
    for (const [key, value] of Object.entries(browser)) {
        const nodeFile = path_1.default
            .resolve(options.rootDir, key)
            .replace(options.rootDir, options.outDir)
            .replace(/\.tsx?$/, ".js");
        const browserFile = path_1.default
            .resolve(options.rootDir, value)
            .replace(options.rootDir, options.outDir)
            .replace(/\.tsx?$/, ".js");
        if (fs_extra_1.default.existsSync(nodeFile) && fs_extra_1.default.existsSync(browserFile)) {
            browserFiles[nodeFile.replace(options.outDir, ".\\").replaceAll(/\\+/gi, "/")] = browserFile.replace(options.outDir, ".\\").replace(/\\+/gi, "/");
            allBrowserFiles[nodeFile.replace(options.outDir, `.\\${type}\\`).replaceAll(/\\+/gi, "/")] = browserFile.replace(options.outDir, `.\\${type}\\`).replace(/\\+/gi, "/");
        }
    }
    fs_extra_1.default.writeFileSync(path_1.default.join(options.outDir, "package.json"), `{
    "type": "${type === "esm" ? "module" : "commonjs"}",
    "types": "../types/index.d.ts"${Object.keys(browserFiles).length > 0
        ? `,
    "browser": ${JSON.stringify(browserFiles, null, 4)}`
        : ""}
}`, "utf-8");
    fs_extra_1.default.writeFileSync(path_1.default.join(options.outDir, "index.d.ts"), `export * from '../types/index.js';`, "utf-8");
    if (type === "esm") {
        fs_extra_1.default.writeFileSync(path_1.default.resolve(options.outDir, "../types/optional-observable.d.ts"), `// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: rxjs dependency is optional and only needed when using methods that require them`, "utf-8");
    }
    else if (typeof browserifyOptions === "object") {
        browserifyOptions.entries = (Array.isArray(browserifyOptions.entries) ? browserifyOptions.entries : [browserifyOptions.entries])
            .filter((p) => typeof p === "string" && p.trim() !== "")
            .map((p) => path_1.default.resolve(options.outDir, p).replace(/\.tsx?$/, ".js"))
            .filter((p) => fs_extra_1.default.existsSync(p));
        if (Array.isArray(browserifyOptions.entries) && browserifyOptions.entries.length > 0) {
            (0, browserify_1.default)({
                entries: browserifyOptions.entries,
                standalone: browserifyOptions.standalone ?? package_json.name ?? "module",
                ignoreTransform: browserifyOptions.ignore ?? [],
                debug: browserifyOptions.debug ?? true,
                bundleExternal: false,
                cache: {},
                packageCache: {},
                basedir: options.outDir,
                insertGlobals: browserifyOptions.insertGlobals ?? false,
                detectGlobals: browserifyOptions.detectGlobals ?? true,
                ignoreMissing: browserifyOptions.ignoreMissing ?? false,
                extensions: browserifyOptions.extensions,
                noParse: browserifyOptions.noParse,
                externalRequireName: browserifyOptions.externalRequireName,
            }).bundle((err, src) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                if (!fs_extra_1.default.existsSync(path_1.default.join(dist_path, "bundle"))) {
                    fs_extra_1.default.mkdirSync(path_1.default.join(dist_path, "bundle"));
                }
                let [code = "", sourceMapping = ""] = src.toString().split("//# sourceMappingURL=");
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.js"), code + "//# sourceMappingURL=index.js.map", "utf-8");
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.js.map"), Buffer.from(sourceMapping.split(",").pop() ?? "", "base64").toString(), "utf-8");
                terser_1.default
                    .minify(src.toString())
                    .then((result) => {
                    fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.min.js"), result.code ?? "", "utf-8");
                })
                    .catch((err) => {
                    console.error(err);
                    process.exit(1);
                });
            });
        }
    }
};
generateProgram("esm");
generateProgram("csj");
fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "package.json"), JSON.stringify({
    name: package_json.name ?? "",
    version: package_json.version ?? "1.0.0",
    description: package_json.description ?? "",
    comments: package_json.comments ?? "",
    main: "./csj/index.js",
    module: "./esm/index.js",
    types: "./types/index.d.ts",
    exports: {
        ".": {
            import: "./esm/index.js",
            require: "./csj/index.js",
            types: "./types/index.d.ts",
        },
        "./esm": {
            import: "./esm/index.js",
            require: "./csj/index.js",
            types: "./types/index.d.ts",
        },
        "./csj": {
            import: "./esm/index.js",
            require: "./csj/index.js",
            types: "./types/index.d.ts",
        },
    },
    browser: allBrowserFiles,
    private: package_json.private ?? false,
    repository: package_json.repository ?? "",
    scripts: {},
    keywords: package_json.keywords ?? [],
    author: package_json.author ?? "",
    license: package_json.license ?? "",
    bugs: package_json.bugs ?? {},
    homepage: package_json.homepage ?? "",
    dependencies: package_json.dependencies ?? {},
    devDependencies: package_json.devDependencies ?? {},
}, null, 4), "utf-8");
//# sourceMappingURL=index.js.map