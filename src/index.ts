#!/usr/bin/env node
import path from "path";
import fs from "fs-extra";
import ts from "typescript";
import { TSConfigContent } from "./types";
import * as glob from "glob";
import browserify from "browserify";
import terser from "terser";
import webpack from "webpack";

const tsconfig_path = path.join(process.cwd(), process.argv.slice(2)[0] ?? "tsconfig.json");
const root_path = path.dirname(tsconfig_path);
const dist_path = path.join(root_path, "dist");
const package_path = path.join(process.cwd(), process.argv.slice(2)[0] ?? "package.json");

if (!fs.existsSync(tsconfig_path)) {
	throw new Error("tsconfig.json not found or not exists");
}

if (!fs.existsSync(package_path)) {
	throw new Error("package.json not found or not exists");
}

if (fs.existsSync(dist_path)) {
	fs.removeSync(dist_path);
}

fs.mkdirSync(dist_path);

console.log(tsconfig_path);
const tsconfig: TSConfigContent = JSON.parse(fs.readFileSync(tsconfig_path, "utf-8"));

console.log(package_path);
const package_json = JSON.parse(fs.readFileSync(package_path, "utf-8"));

const rootNames = tsconfig.files || [];
const includes = tsconfig.include || [];
const excludes = tsconfig.exclude || [];

function matchFiles(patterns: string[], excludePatterns: string[] = []) {
	const files: string[] = [];
	patterns.forEach((pattern: string) => {
		const globFiles = glob.sync(pattern, {
			cwd: root_path,
			ignore: excludePatterns,
		});
		files.push(...globFiles);
	});
	return files;
}

// Obtém todos os arquivos incluídos com base no tsconfig.json
const allFiles = rootNames.concat(matchFiles(includes, excludes)).map((file) => path.join(root_path, file));

const allBrowserFiles: Record<string, string> = {};

const main_dir = package_json.main ? path.resolve(path.dirname(package_path), package_json.main) : undefined;
const browser_dir = package_json.browser ? path.resolve(path.dirname(package_path), package_json.browser) : undefined;
const module_dir = package_json.module ? path.resolve(path.dirname(package_path), package_json.module) : main_dir;

let rootDir = tsconfig.compilerOptions?.rootDir ?? "";

const generateProgram = (type: "esm" | "csj"): void => {
	let { compilerOptions = {}, browser = {}, browserify: browserifyOptions } = { ...tsconfig };

	const options = {
		noEmitOnError: true,
		noImplicitAny: true,
		target: type === "esm" ? ts.ScriptTarget.ES2020 : ts.ScriptTarget.ES2017,
		module: type === "esm" ? ts.ModuleKind.ES2020 : ts.ModuleKind.CommonJS,
		moduleResolution: ts.ModuleResolutionKind.Node16,
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
		rootDir: path.join(root_path, compilerOptions.rootDir ?? ""),
		outDir: path.join(dist_path, type),
		declarationDir: type === "esm" ? path.join(dist_path, "types") : undefined,
	};

	rootDir = options.rootDir;

	const host = ts.createCompilerHost(options);
	const program = ts.createProgram(allFiles, options, host);
	const result = program.emit();

	if (result.emitSkipped) {
		const errors = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
		errors.forEach((diagnostic) => {
			if (diagnostic.file) {
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
				const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
				console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
			} else {
				console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
			}
		});
		process.exit(1);
	}

	const browserFiles: Record<string, string> = {};

	for (const [key, value] of Object.entries(browser)) {
		const nodeFile = path
			.resolve(options.rootDir, key)
			.replace(options.rootDir, options.outDir)
			.replace(/\.tsx?$/, ".js");
		const browserFile = path
			.resolve(options.rootDir, value)
			.replace(options.rootDir, options.outDir)
			.replace(/\.tsx?$/, ".js");

		if (fs.existsSync(nodeFile) && fs.existsSync(browserFile)) {
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
		const m = path.resolve(options.outDir, main_path).replace(path.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");
		const b = path.resolve(options.outDir, browser_path).replace(path.dirname(options.outDir), ".\\").replace(/\\+/gi, "/");

		if (!(m in allBrowserFiles)) {
			allBrowserFiles[m] = b;
		}
	}

	fs.writeFileSync(
		path.join(options.outDir, "package.json"),
		`{
    "type": "${type === "esm" ? "module" : "commonjs"}",
    ${
		main_path
			? `"main": "${main_path}",
    `
			: ""
	}${
			browser_path
				? `"browser": "${browser_path}",
    `
				: ""
		}${
			module_path
				? `"module": "${module_path}",
    `
				: ""
		}"types": "../types/index.d.ts"${
			Object.keys(browserFiles).length > 0
				? `,
    "browser": ${JSON.stringify(browserFiles, null, 4)}`
				: ""
		}
}`,
		"utf-8",
	);

	fs.writeFileSync(path.join(options.outDir, "index.d.ts"), `export * from '../types/index.js';`, "utf-8");

	if (type === "esm") {
		fs.writeFileSync(
			path.resolve(options.outDir, "../types/optional-observable.d.ts"),
			`// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: rxjs dependency is optional and only needed when using methods that require them`,
			"utf-8",
		);
	} else if (typeof browserifyOptions === "object") {
		browserifyOptions.entries = (Array.isArray(browserifyOptions.entries) ? browserifyOptions.entries : [browserifyOptions.entries])
			.filter((p) => typeof p === "string" && p.trim() !== "")
			.map((p) => path.resolve(options.outDir, p as any).replace(/\.tsx?$/, ".js"))
			.filter((p) => fs.existsSync(p));

		if (Array.isArray(browserifyOptions.entries) && browserifyOptions.entries.length > 0) {
			webpack({
				mode: "production",
				target: "web",
				entry: browserifyOptions.entries,
				output: {
					path: path.join(dist_path, "bundle"),
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

				const src = fs.readFileSync(path.join(dist_path, "bundle", "index.js"));

				if (!fs.existsSync(path.join(dist_path, "bundle"))) {
					fs.mkdirSync(path.join(dist_path, "bundle"));
				}

				// let [code = "", sourceMapping = ""] = src.toString().split("//# sourceMappingURL=");

				// fs.writeFileSync(path.join(dist_path, "bundle", "index.js"), code + "//# sourceMappingURL=index.js.map", "utf-8");
				// fs.writeFileSync(path.join(dist_path, "bundle", "index.js.map"), Buffer.from(sourceMapping.split(",").pop() ?? "", "base64").toString(), "utf-8");

				terser
					.minify(src.toString())
					.then((result) => {
						fs.writeFileSync(path.join(dist_path, "bundle", "index.min.js"), result.code ?? "", "utf-8");
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

fs.writeFileSync(
	path.resolve(dist_path, "package.json"),
	JSON.stringify(
		{
			name: package_json.name ?? "",
			type: package_json.type ?? "module",
			version: package_json.version ?? "1.0.0",
			description: package_json.description ?? "",
			comments: package_json.comments ?? "",
			main: package_main ?? "./csj/index.js",
			module: package_module ?? "./esm/index.js",
			types: "./types/index.d.ts",
			exports: {
				".": {
					import: package_module ?? "./esm/index.js",
					require: package_main ?? "./csj/index.js",
					types: "./types/index.d.ts",
				},
				"./esm": {
					import: package_module ?? "./esm/index.js",
					require: package_main ?? "./csj/index.js",
					types: "./types/index.d.ts",
				},
				"./csj": {
					import: package_module ?? "./esm/index.js",
					require: package_main ?? "./csj/index.js",
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
		},
		null,
		4,
	),
	"utf-8",
);
