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
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const typescript_1 = __importDefault(require("typescript"));
const glob = __importStar(require("glob"));
const terser_1 = __importDefault(require("terser"));
const webpack_1 = __importDefault(require("webpack"));
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
console.log(tsconfig_path);
const tsconfig = JSON.parse(fs_extra_1.default.readFileSync(tsconfig_path, "utf-8"));
console.log(package_path);
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
const main_dir = package_json.main ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.main) : undefined;
const browser_dir = package_json.browser ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.browser) : undefined;
const module_dir = package_json.module ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.module) : main_dir;
let rootDir = (_d = (_c = tsconfig.compilerOptions) === null || _c === void 0 ? void 0 : _c.rootDir) !== null && _d !== void 0 ? _d : "";
const generateProgram = (type) => {
    var _a, _b, _c;
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
    rootDir = options.rootDir;
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
    const main_path = main_dir
        ? main_dir
            .replace(options.rootDir, ".\\")
            .replace(/\\+/gi, "/")
            .replace(/\.tsx?$/, ".js")
        : undefined;
    const browser_path = browser_dir
        ? browser_dir
            .replace(options.rootDir, ".\\")
            .replace(/\\+/gi, "/")
            .replace(/\.tsx?$/, ".js")
        : undefined;
    const module_path = module_dir
        ? module_dir
            .replace(options.rootDir, ".\\")
            .replace(/\\+/gi, "/")
            .replace(/\.tsx?$/, ".js")
        : undefined;
    if (main_path && browser_path) {
        const m = path_1.default.resolve(options.outDir, main_path).replace(path_1.default.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");
        const b = path_1.default.resolve(options.outDir, browser_path).replace(path_1.default.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");
        if (!(m in allBrowserFiles)) {
            allBrowserFiles[m] = b;
        }
    }
    fs_extra_1.default.writeFileSync(path_1.default.join(options.outDir, "package.json"), `{
    "type": "${type === "esm" ? "module" : "commonjs"}",
    ${main_path
        ? `"main": "${main_path}",
    `
        : ""}${browser_path
        ? `"browser": "${browser_path}",
    `
        : ""}${module_path
        ? `"module": "${module_path}",
    `
        : ""}"types": "../types/index.d.ts"${Object.keys(browserFiles).length > 0
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
            (0, webpack_1.default)({
                mode: "production",
                target: "web",
                entry: browserifyOptions.entries,
                output: {
                    path: path_1.default.join(dist_path, "bundle"),
                    filename: "index.js",
                    library: (_c = (_b = browserifyOptions.standalone) !== null && _b !== void 0 ? _b : package_json.name) !== null && _c !== void 0 ? _c : "module",
                    libraryTarget: "umd",
                    globalObject: "this", // Corrija o erro de 'window is not defined'
                },
                optimization: {
                    minimize: false,
                },
            }).run((err, stats) => {
                if (err || !stats) {
                    console.error(err !== null && err !== void 0 ? err : "An error occurred while bundling");
                    process.exit(1);
                }
                const src = fs_extra_1.default.readFileSync(path_1.default.join(dist_path, "bundle", "index.js"));
                if (!fs_extra_1.default.existsSync(path_1.default.join(dist_path, "bundle"))) {
                    fs_extra_1.default.mkdirSync(path_1.default.join(dist_path, "bundle"));
                }
                // let [code = "", sourceMapping = ""] = src.toString().split("//# sourceMappingURL=");
                // fs.writeFileSync(path.join(dist_path, "bundle", "index.js"), code + "//# sourceMappingURL=index.js.map", "utf-8");
                // fs.writeFileSync(path.join(dist_path, "bundle", "index.js.map"), Buffer.from(sourceMapping.split(",").pop() ?? "", "base64").toString(), "utf-8");
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
            // browserify({
            // 	entries: browserifyOptions.entries,
            // 	standalone: browserifyOptions.standalone ?? package_json.name ?? "module",
            // 	ignoreTransform: browserifyOptions.ignore ?? [],
            // 	debug: browserifyOptions.debug ?? true,
            // 	bundleExternal: false,
            // 	cache: {},
            // 	packageCache: {},
            // 	basedir: options.outDir,
            // 	insertGlobals: browserifyOptions.insertGlobals ?? false,
            // 	detectGlobals: browserifyOptions.detectGlobals ?? true,
            // 	ignoreMissing: browserifyOptions.ignoreMissing ?? false,
            // 	extensions: browserifyOptions.extensions,
            // 	noParse: browserifyOptions.noParse,
            // 	externalRequireName: browserifyOptions.externalRequireName,
            // }).bundle((err, src) => {
            // 	if (err) {
            // 		console.error(err);
            // 		process.exit(1);
            // 	}
            // 	if (!fs.existsSync(path.join(dist_path, "bundle"))) {
            // 		fs.mkdirSync(path.join(dist_path, "bundle"));
            // 	}
            // 	let [code = "", sourceMapping = ""] = src.toString().split("//# sourceMappingURL=");
            // 	fs.writeFileSync(path.join(dist_path, "bundle", "index.js"), code + "//# sourceMappingURL=index.js.map", "utf-8");
            // 	fs.writeFileSync(path.join(dist_path, "bundle", "index.js.map"), Buffer.from(sourceMapping.split(",").pop() ?? "", "base64").toString(), "utf-8");
            // 	terser
            // 		.minify(src.toString())
            // 		.then((result) => {
            // 			fs.writeFileSync(path.join(dist_path, "bundle", "index.min.js"), result.code ?? "", "utf-8");
            // 		})
            // 		.catch((err) => {
            // 			console.error(err);
            // 			process.exit(1);
            // 		});
            // });
        }
    }
};
generateProgram("esm");
generateProgram("csj");
const package_main = main_dir ? main_dir.replace(rootDir, ".\\csj\\").replace(/\\+/gi, "/") : undefined;
const package_browser = browser_dir ? browser_dir.replace(rootDir, ".\\csj\\").replace(/\\+/gi, "/") : undefined;
const package_module = module_dir ? module_dir.replace(rootDir, ".\\esm\\").replace(/\\+/gi, "/") : undefined;
fs_extra_1.default.writeFileSync(path_1.default.resolve(dist_path, "package.json"), JSON.stringify({
    name: (_e = package_json.name) !== null && _e !== void 0 ? _e : "",
    type: (_f = package_json.type) !== null && _f !== void 0 ? _f : "module",
    version: (_g = package_json.version) !== null && _g !== void 0 ? _g : "1.0.0",
    description: (_h = package_json.description) !== null && _h !== void 0 ? _h : "",
    comments: (_j = package_json.comments) !== null && _j !== void 0 ? _j : "",
    main: package_main !== null && package_main !== void 0 ? package_main : "./csj/index.js",
    module: package_module !== null && package_module !== void 0 ? package_module : "./esm/index.js",
    types: "./types/index.d.ts",
    exports: {
        ".": {
            import: package_module !== null && package_module !== void 0 ? package_module : "./esm/index.js",
            require: package_main !== null && package_main !== void 0 ? package_main : "./csj/index.js",
            types: "./types/index.d.ts",
        },
        "./esm": {
            import: package_module !== null && package_module !== void 0 ? package_module : "./esm/index.js",
            require: package_main !== null && package_main !== void 0 ? package_main : "./csj/index.js",
            types: "./types/index.d.ts",
        },
        "./csj": {
            import: package_module !== null && package_module !== void 0 ? package_module : "./esm/index.js",
            require: package_main !== null && package_main !== void 0 ? package_main : "./csj/index.js",
            types: "./types/index.d.ts",
        },
    },
    browser: package_browser !== null && package_browser !== void 0 ? package_browser : allBrowserFiles,
    private: (_k = package_json.private) !== null && _k !== void 0 ? _k : false,
    repository: (_l = package_json.repository) !== null && _l !== void 0 ? _l : "",
    bin: (_m = package_json.bin) !== null && _m !== void 0 ? _m : {
        [(_o = package_json.name) !== null && _o !== void 0 ? _o : "module"]: "./csj/index.js",
    },
    scripts: {
        start: "node ./csj/index.js",
    },
    keywords: (_p = package_json.keywords) !== null && _p !== void 0 ? _p : [],
    author: (_q = package_json.author) !== null && _q !== void 0 ? _q : "",
    license: (_r = package_json.license) !== null && _r !== void 0 ? _r : "",
    bugs: (_s = package_json.bugs) !== null && _s !== void 0 ? _s : {},
    homepage: (_t = package_json.homepage) !== null && _t !== void 0 ? _t : "",
    dependencies: (_u = package_json.dependencies) !== null && _u !== void 0 ? _u : {},
    devDependencies: (_v = package_json.devDependencies) !== null && _v !== void 0 ? _v : {},
}, null, 4), "utf-8");
//# sourceMappingURL=index.js.map