#!/usr/bin/env node
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
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const typescript_1 = __importDefault(require("typescript"));
const glob = __importStar(require("glob"));
const browserify_1 = __importDefault(require("browserify"));
const terser_1 = __importDefault(require("terser"));
const tsconfig_path = path_1.default.join(process.cwd(), (_a = process.argv.slice(2)[0]) !== null && _a !== void 0 ? _a : "tsconfig.json");
const root_path = path_1.default.dirname(tsconfig_path);
const dist_path = path_1.default.join(root_path, "dist");
const package_path = path_1.default.join(process.cwd(), (_b = process.argv.slice(2)[0]) !== null && _b !== void 0 ? _b : "package.json");
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let { compilerOptions = {}, browser = {}, browserify: browserifyOptions } = Object.assign({}, tsconfig);
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
        rootDir: path_1.default.join(root_path, (_a = compilerOptions.rootDir) !== null && _a !== void 0 ? _a : ""),
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
                standalone: (_c = (_b = browserifyOptions.standalone) !== null && _b !== void 0 ? _b : package_json.name) !== null && _c !== void 0 ? _c : "module",
                ignoreTransform: (_d = browserifyOptions.ignore) !== null && _d !== void 0 ? _d : [],
                debug: (_e = browserifyOptions.debug) !== null && _e !== void 0 ? _e : true,
                bundleExternal: false,
                cache: {},
                packageCache: {},
                basedir: options.outDir,
                insertGlobals: (_f = browserifyOptions.insertGlobals) !== null && _f !== void 0 ? _f : false,
                detectGlobals: (_g = browserifyOptions.detectGlobals) !== null && _g !== void 0 ? _g : true,
                ignoreMissing: (_h = browserifyOptions.ignoreMissing) !== null && _h !== void 0 ? _h : false,
                extensions: browserifyOptions.extensions,
                noParse: browserifyOptions.noParse,
                externalRequireName: browserifyOptions.externalRequireName,
            }).bundle((err, src) => {
                var _a;
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                if (!fs_extra_1.default.existsSync(path_1.default.join(dist_path, "bundle"))) {
                    fs_extra_1.default.mkdirSync(path_1.default.join(dist_path, "bundle"));
                }
                let [code = "", sourceMapping = ""] = src.toString().split("//# sourceMappingURL=");
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.js"), code + "//# sourceMappingURL=index.js.map", "utf-8");
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.js.map"), Buffer.from((_a = sourceMapping.split(",").pop()) !== null && _a !== void 0 ? _a : "", "base64").toString(), "utf-8");
                terser_1.default
                    .minify(src.toString())
                    .then((result) => {
                    var _a;
                    fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.min.js"), (_a = result.code) !== null && _a !== void 0 ? _a : "", "utf-8");
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
    name: (_c = package_json.name) !== null && _c !== void 0 ? _c : "",
    type: (_d = package_json.type) !== null && _d !== void 0 ? _d : "module",
    version: (_e = package_json.version) !== null && _e !== void 0 ? _e : "1.0.0",
    description: (_f = package_json.description) !== null && _f !== void 0 ? _f : "",
    comments: (_g = package_json.comments) !== null && _g !== void 0 ? _g : "",
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
    private: (_h = package_json.private) !== null && _h !== void 0 ? _h : false,
    repository: (_j = package_json.repository) !== null && _j !== void 0 ? _j : "",
    bin: (_k = package_json.bin) !== null && _k !== void 0 ? _k : {
        [(_l = package_json.name) !== null && _l !== void 0 ? _l : "module"]: "./csj/index.js",
    },
    scripts: {
        start: "node ./csj/index.js",
    },
    keywords: (_m = package_json.keywords) !== null && _m !== void 0 ? _m : [],
    author: (_o = package_json.author) !== null && _o !== void 0 ? _o : "",
    license: (_p = package_json.license) !== null && _p !== void 0 ? _p : "",
    bugs: (_q = package_json.bugs) !== null && _q !== void 0 ? _q : {},
    homepage: (_r = package_json.homepage) !== null && _r !== void 0 ? _r : "",
    dependencies: (_s = package_json.dependencies) !== null && _s !== void 0 ? _s : {},
    devDependencies: (_t = package_json.devDependencies) !== null && _t !== void 0 ? _t : {},
}, null, 4), "utf-8");
//# sourceMappingURL=index.js.map