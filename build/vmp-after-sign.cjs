const { execFileSync } = require("node:child_process");

module.exports = async function (context) {
    if (context.electronPlatformName !== "win32") return;
    execFileSync("py", ["-m", "castlabs_evs.vmp", "sign-pkg", context.appOutDir], { stdio: "inherit" })
};
