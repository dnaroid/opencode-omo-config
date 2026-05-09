import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST ?? "localhost";

const nextConfig: NextConfig = {
	output: "export",
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
	assetPrefix: isProd ? "." : `http://${internalHost}:3101`,
};

export default nextConfig;
