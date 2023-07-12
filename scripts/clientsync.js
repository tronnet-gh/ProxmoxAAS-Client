import { requestAPI } from "./utils.js";

export async function setupClientSync (callback) {
	let scheme = localStorage.getItem("sync-scheme");
	let rate = Number(localStorage.getItem("sync-rate"));
	if (!scheme) {
		scheme = "always";
		localStorage.setItem("sync-scheme", "always");
	}
	if (!rate) {
		rate = "5";
		localStorage.setItem("sync-rate", "5")
	}

	if (scheme === "always") {
		callback();
		window.setInterval(callback, rate * 1000);
	}
	else if (scheme === "hash") {
		const newHash = (await requestAPI("/sync/hash")).data;
		localStorage.setItem("sync-current-hash", newHash);
		callback();
		window.setInterval(async () => {
			const newHash = (await requestAPI("/sync/hash")).data;
			if (localStorage.getItem("sync-current-hash") !== newHash) {
				localStorage.setItem("sync-current-hash", newHash);
				callback();
			}
		}, rate * 1000);
	}
	else if (scheme === "interrupt") {

	}
	else {

	}
} 