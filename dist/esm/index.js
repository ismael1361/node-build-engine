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
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const typescript_1 = __importDefault(require("typescript"));
const glob = __importStar(require("glob"));
const terser_1 = __importDefault(require("terser"));
const webpack_1 = __importDefault(require("webpack"));
const babel = __importStar(require("@babel/core"));
const createDirectories = (dirPath) => {
    // Usa path.resolve para garantir um caminho absoluto.
    const absolutePath = path_1.default.resolve(dirPath);
    //return fs.mkdirSync(absolutePath, { recursive: true });
    if (!fs_extra_1.default.existsSync(path_1.default.dirname(absolutePath))) {
        createDirectories(path_1.default.dirname(absolutePath));
    }
    if (!fs_extra_1.default.existsSync(absolutePath)) {
        return fs_extra_1.default.mkdirSync(absolutePath, { recursive: true });
    }
};
const findFilePath = (fileName) => {
    let file_path = path_1.default.join(process.cwd(), fileName);
    while (!fs_extra_1.default.existsSync(file_path)) {
        const dirPath = path_1.default.resolve(path_1.default.dirname(file_path), "../");
        if (/^[A-Z]:(\\|\/)?$/g.test(dirPath)) {
            return undefined;
        }
        file_path = path_1.default.join(dirPath, "package.json");
    }
    return file_path;
};
const tsconfig_path = findFilePath(process.argv.slice(2)[0] ?? "tsconfig.json");
if (!tsconfig_path || !fs_extra_1.default.existsSync(tsconfig_path)) {
    throw new Error("tsconfig.json not found or not exists");
}
const root_path = path_1.default.dirname(tsconfig_path);
const dist_path = path_1.default.join(root_path, "dist");
const package_path = findFilePath("package.json");
if (!package_path || !fs_extra_1.default.existsSync(package_path)) {
    throw new Error("package.json not found or not exists");
}
if (fs_extra_1.default.existsSync(dist_path)) {
    fs_extra_1.default.removeSync(dist_path);
}
fs_extra_1.default.mkdirSync(dist_path);
const mkdir = (dir) => {
    try {
        if (fs_extra_1.default.existsSync(dir)) {
            return fs_extra_1.default.statSync(dir).isDirectory();
        }
        if (!fs_extra_1.default.existsSync(path_1.default.dirname(dir))) {
            mkdir(path_1.default.dirname(dir));
        }
        fs_extra_1.default.mkdirSync(dir);
    }
    catch {
        return false;
    }
    return true;
};
console.log(tsconfig_path);
const tsconfig = JSON.parse(fs_extra_1.default.readFileSync(tsconfig_path, "utf-8"));
console.log(package_path);
const package_json = JSON.parse(fs_extra_1.default.readFileSync(package_path, "utf-8"));
const extFilesConverter = {
    ".js": ".js",
    ".jsx": ".js",
    ".ts": ".js",
    ".tsx": ".js",
    ".cts": ".cjs",
    ".mts": ".mjs",
};
const fileNameToLocalDist = (fileName) => {
    const ext = path_1.default.extname(fileName);
    return fileName.replace(ext, extFilesConverter[ext] ?? ext);
};
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
const allFiles = rootNames
    .concat(matchFiles(includes, excludes))
    .map((file) => path_1.default.join(root_path, file))
    .filter((p) => {
    const exts = [".ts", ".tsx", ".d.ts", ".cts", ".d.cts", ".mts", ".d.mts"];
    if (fs_extra_1.default.existsSync(p)) {
        return fs_extra_1.default.statSync(p).isFile() && exts.includes(path_1.default.extname(p));
    }
    return false;
});
allFiles.forEach((file) => {
    console.log(file);
});
const allBrowserFiles = {};
const main_dir = package_json.main ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.main) : undefined;
const browser_dir = package_json.browser ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.browser) : undefined;
const module_dir = package_json.module ? path_1.default.resolve(path_1.default.dirname(package_path), package_json.module) : main_dir;
let rootDir = tsconfig.compilerOptions?.rootDir ?? "";
const generateProgram = (type) => {
    let { compilerOptions = {}, browser = {}, browserify: browserifyOptions } = { ...tsconfig };
    rootDir = path_1.default.join(root_path, compilerOptions.rootDir ?? "");
    const options = {
        ...compilerOptions,
        lib: (compilerOptions.lib ?? []).map((lib) => `lib.${lib.toLowerCase()}.d.ts`),
        noEmitOnError: true,
        noImplicitAny: true,
        //target: type === "esm" ? ts.ScriptTarget.ES2020 : ts.ScriptTarget.ES2017,
        target: typescript_1.default.ScriptTarget.ESNext,
        module: type === "esm" ? typescript_1.default.ModuleKind.ES2020 : typescript_1.default.ModuleKind.Node16,
        moduleResolution: type === "esm" ? typescript_1.default.ModuleResolutionKind.Bundler : typescript_1.default.ModuleResolutionKind.Node16,
        listEmittedFiles: false,
        sourceMap: true,
        pretty: true,
        declaration: type === "esm",
        declarationMap: type === "esm",
        skipLibCheck: true,
        strict: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        removeComments: false,
        noEmit: false,
        rootDir,
        outDir: path_1.default.join(dist_path, type),
        declarationDir: type === "esm" ? path_1.default.join(dist_path, "types") : undefined,
        typeRoots: [...(compilerOptions.typeRoots ?? []), "node_modules/@types", "path/to/your/typings"],
        paths: {
            "*": [`${rootDir.replace(/\\/gi, "/").replace(/\/$/gi, "")}/*`],
            ...Object.fromEntries(Object.entries(compilerOptions.paths ?? {}).map(([key, value]) => [key, value.map((v) => path_1.default.join(rootDir, v).replace(/\\/gi, "/").replace(/\/$/gi, ""))])),
        },
    };
    //const host = ts.createCompilerHost(options);
    const host = {
        getSourceFile: (fileName, languageVersion) => {
            if (!fs_extra_1.default.existsSync(fileName)) {
                return undefined;
            }
            const sourceText = fs_extra_1.default.readFileSync(fileName, "utf8");
            return typescript_1.default.createSourceFile(fileName, sourceText, languageVersion);
        },
        getDefaultLibFileName: (options) => typescript_1.default.getDefaultLibFilePath(options),
        writeFile: (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
            fs_extra_1.default.outputFileSync(fileName, data, { encoding: "utf-8" });
        },
        getCurrentDirectory: () => package_path,
        getDirectories: (path) => fs_extra_1.default.readdirSync(path).filter((f) => fs_extra_1.default.statSync(path).isDirectory()),
        fileExists: fs_extra_1.default.existsSync,
        readFile: (fileName) => fs_extra_1.default.readFileSync(fileName, "utf-8").toString(),
        readDirectory: (fileName) => fs_extra_1.default.readdirSync(fileName),
        useCaseSensitiveFileNames: () => process.platform !== "win32",
        getCanonicalFileName: (fileName) => (process.platform === "win32" ? fileName.toLowerCase() : fileName),
        getNewLine: () => "\n",
        realpath: fs_extra_1.default.realpathSync,
        trace: (s) => {
            //console.log(s);
        },
        directoryExists: (d) => fs_extra_1.default.existsSync(d) && fs_extra_1.default.statSync(d).isDirectory(),
        getEnvironmentVariable: () => "",
        hasInvalidatedResolutions(filePath) {
            return false;
        },
        // getDefaultLibFileName(options: ts.CompilerOptions): string {
        // 	// Resolve o caminho para o arquivo lib.d.ts
        // 	return path.join(path.dirname(require.resolve("typescript")), "lib", "lib.d.ts");
        // },
    };
    if (type === "esm") {
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
    }
    else {
        const esm_files = glob.sync("esm/**/*.js", {
            cwd: dist_path,
            ignore: ["esm/**/*.d.ts"],
        });
        esm_files.forEach((file) => {
            const code = fs_extra_1.default.readFileSync(path_1.default.join(dist_path, file), "utf-8");
            const { code: transformedCode, map: transformedMap } = babel.transform(code, {
                presets: [
                    [
                        "@babel/preset-env",
                        {
                            targets: {
                                browsers: ["last 2 versions", "ie >= 11"],
                            },
                            useBuiltIns: false,
                        },
                    ],
                    "@babel/preset-react",
                ],
                plugins: [
                    ["@babel/plugin-proposal-decorators", { legacy: true }],
                    ["@babel/plugin-proposal-class-properties", { loose: false }],
                    ["@babel/plugin-transform-object-rest-spread", { useBuiltIns: true }],
                    "add-module-exports",
                    "@babel/plugin-proposal-nullish-coalescing-operator",
                    "@babel/plugin-proposal-optional-chaining",
                    "@babel/plugin-proposal-logical-assignment-operators",
                ],
                sourceMaps: true,
            }) ?? {};
            file = file.replace(/^esm\\/gi, "");
            const isDir = mkdir(path_1.default.dirname(path_1.default.join(dist_path, type, file)));
            if (isDir) {
                createDirectories(path_1.default.join(dist_path, type));
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, type, file), transformedCode ?? "", "utf-8");
                fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, type, `${file}.map`), JSON.stringify(transformedMap), "utf-8");
            }
        });
    }
    const browserFiles = {};
    for (const [key, value] of Object.entries(browser)) {
        const nodeFile = fileNameToLocalDist(path_1.default.resolve(options.rootDir, key)).replace(options.rootDir, options.outDir);
        const browserFile = fileNameToLocalDist(path_1.default.resolve(options.rootDir, value)).replace(options.rootDir, options.outDir);
        if (fs_extra_1.default.existsSync(nodeFile) && fs_extra_1.default.existsSync(browserFile)) {
            browserFiles[nodeFile.replace(options.outDir, ".\\").replaceAll(/\\+/gi, "/")] = browserFile.replace(options.outDir, ".\\").replace(/\\+/gi, "/");
            allBrowserFiles[nodeFile.replace(options.outDir, `.\\${type}\\`).replaceAll(/\\+/gi, "/")] = browserFile.replace(options.outDir, `.\\${type}\\`).replace(/\\+/gi, "/");
        }
    }
    const main_path = main_dir ? fileNameToLocalDist(main_dir.replace(options.rootDir, ".\\")).replace(/\\+/gi, "/") : undefined;
    const browser_path = browser_dir ? fileNameToLocalDist(browser_dir.replace(options.rootDir, ".\\")).replace(/\\+/gi, "/") : undefined;
    const module_path = module_dir ? fileNameToLocalDist(module_dir.replace(options.rootDir, ".\\")).replace(/\\+/gi, "/") : undefined;
    if (main_path && browser_path) {
        const m = path_1.default.resolve(options.outDir, main_path).replace(path_1.default.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");
        const b = path_1.default.resolve(options.outDir, browser_path).replace(path_1.default.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");
        if (!(m in allBrowserFiles)) {
            allBrowserFiles[m] = b;
        }
    }
    createDirectories(options.outDir);
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
        createDirectories(path_1.default.resolve(options.outDir, "../types"));
        fs_extra_1.default.writeFileSync(path_1.default.resolve(options.outDir, "../types/optional-observable.d.ts"), `// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: rxjs dependency is optional and only needed when using methods that require them`, "utf-8");
    }
    else if (typeof browserifyOptions === "object") {
        browserifyOptions.entries = (Array.isArray(browserifyOptions.entries) ? browserifyOptions.entries : [browserifyOptions.entries])
            .filter((p) => typeof p === "string" && p.trim() !== "")
            .map((p) => fileNameToLocalDist(path_1.default.resolve(options.outDir, p)))
            .filter((p) => fs_extra_1.default.existsSync(p));
        if (Array.isArray(browserifyOptions.entries) && browserifyOptions.entries.length > 0) {
            (0, webpack_1.default)({
                mode: "production",
                target: "web",
                entry: browserifyOptions.entries,
                output: {
                    path: path_1.default.join(dist_path, "bundle"),
                    filename: "index.js",
                    library: browserifyOptions.standalone ?? package_json.name ?? "module", // Especifique o nome da biblioteca UMD
                    libraryTarget: "umd", // Gere no formato UMD
                    globalObject: "this", // Corrija o erro de 'window is not defined'
                },
                optimization: {
                    minimize: false,
                },
            }).run((err, stats) => {
                if (err || !stats) {
                    console.error(err ?? "An error occurred while bundling");
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
                    fs_extra_1.default.writeFileSync(path_1.default.join(dist_path, "bundle", "index.min.js"), result.code ?? "", "utf-8");
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
/*"babel-cli": "^6.6.5",
    "babel-core": "^6.26.3",
    "babel-eslint": "^7.2.3",
    "babel-istanbul": "^0.12.2",
    "babel-plugin-add-module-exports": "^0.1.2",
    "babel-plugin-istanbul": "^4.1.6",
    "babel-plugin-transform-object-rest-spread": "^6.23.0",
    "babel-preset-es2015": "^6.6.0",
    "babel-preset-react": "^6.5.0",
    "babel-preset-stage-2": "^6.13.0",*/
// npm install --save-dev babel-cli babel-core babel-eslint babel-istanbul babel-plugin-add-module-exports babel-plugin-istanbul babel-plugin-transform-object-rest-spread babel-preset-es2015 babel-preset-react babel-preset-stage-2
const package_main = main_dir ? main_dir.replace(rootDir, ".\\csj\\").replace(/\\+/gi, "/") : undefined;
const package_browser = browser_dir ? browser_dir.replace(rootDir, ".\\csj\\").replace(/\\+/gi, "/") : undefined;
const package_module = module_dir ? module_dir.replace(rootDir, ".\\esm\\").replace(/\\+/gi, "/") : undefined;
const resolveExtTs = (fileName) => {
    return fileName
        .replace(/\.ts$/gi, ".js")
        .replace(/\.cts$/gi, ".cjs")
        .replace(/\.mts$/gi, ".mjs");
};
createDirectories(dist_path);
fs_extra_1.default.writeFileSync(path_1.default.resolve(dist_path, "package.json"), JSON.stringify({
    name: package_json.name ?? "",
    type: package_json.type ?? "module",
    version: package_json.version ?? "1.0.0",
    description: package_json.description ?? "",
    comments: package_json.comments ?? "",
    main: resolveExtTs(package_main ?? "./csj/index.js"),
    module: resolveExtTs(package_module ?? "./esm/index.js"),
    types: "./types/index.d.ts",
    exports: {
        ".": {
            import: resolveExtTs(package_module ?? "./esm/index.js"),
            require: resolveExtTs(package_main ?? "./csj/index.js"),
            types: "./types/index.d.ts",
        },
        "./esm": {
            import: resolveExtTs(package_module ?? "./esm/index.js"),
            require: resolveExtTs(package_main ?? "./csj/index.js"),
            types: "./types/index.d.ts",
        },
        "./csj": {
            import: resolveExtTs(package_module ?? "./esm/index.js"),
            require: resolveExtTs(package_main ?? "./csj/index.js"),
            types: "./types/index.d.ts",
        },
    },
    browser: package_browser ?? allBrowserFiles,
    private: package_json.private ?? false,
    repository: package_json.repository ?? "",
    bin: package_json.bin ?? {
        [package_json.name ?? "module"]: "./csj/index.js",
    },
    scripts: {
        start: "node ./csj/index.js",
    },
    keywords: package_json.keywords ?? [],
    author: package_json.author ?? "",
    license: package_json.license ?? "",
    bugs: package_json.bugs ?? {},
    homepage: package_json.homepage ?? "",
    dependencies: package_json.dependencies ?? {},
    devDependencies: package_json.devDependencies ?? {},
}, null, 4), "utf-8");
//# sourceMappingURL=index.js.map