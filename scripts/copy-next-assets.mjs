import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("out");
const nextAssets = path.join(outDir, "_next");
const routeDirs = [
	path.join(outDir, "settings", "opencode"),
	path.join(outDir, "settings", "oh-my-openagent"),
];

await Promise.all(
	routeDirs.map(async (routeDir) => {
		await mkdir(routeDir, { recursive: true });
		await cp(nextAssets, path.join(routeDir, "_next"), {
			recursive: true,
			force: true,
		});
	}),
);
