const { execFileSync } = require("node:child_process");

module.exports = async function (context) {
    if (context.electronPlatformname !== "darwin") return;
    execFileSync("/usr/bin/python3", ["-m", "castlabs_evs.vmp", "sign-pkg", context.appOutDir], { stdio: "inherit" });
};
