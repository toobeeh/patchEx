const elements = {
    replacementsView: document.querySelector("#replacementsView"),
    injectionsView: document.querySelector("#injectionsView"),
    addReplacement: document.querySelector("#addReplacement"),
    addInjection: document.querySelector("#addInjection"),
    replaceTarget: document.querySelector("#replaceTarget"),
    replaceSource: document.querySelector("#replaceSource"),
    injectCode: document.querySelector("#injectCode"),
    injectAtRegex: document.querySelector("#injectAtRegex"),
    patchCode: document.querySelector("#patchCode"),
    inputCode: document.querySelector("#inputCode"),
    outputCode: document.querySelector("#outputCode"),
};
class PatchReplacement {
    listItem;
    sourceRegex;
    targetRegex;
    constructor(source, target) {
        this.sourceRegex = new RegExp(source, "g");
        this.targetRegex = new RegExp(target, "g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Replace <code>" + source + "</code> to <code>" + target + "</code>";
        elements.replacementsView.appendChild(this.listItem);
    }
}
class PatchInjection {
    listItem;
    injectionCode;
    injectionPositionRegex;
    constructor(code, position) {
        this.injectionCode = code.trim();
        this.injectionPositionRegex = new RegExp(position, "g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Before first group of <code>" + position + "</code> insert <code>" + code.substr(0, 100) + "</code>";
        elements.injectionsView.appendChild(this.listItem);
    }
}
class PatchInjectionResult {
    matches;
    recursionAbort;
    injection;
    constructor(injection, matches, recursionAbort) {
        this.injection = injection;
        this.recursionAbort = recursionAbort;
        this.matches = matches;
    }
}
class PatchReplacementResult {
    matches;
    recursionAbort;
    replacement;
    constructor(replacement, matches, recursionAbort) {
        this.replacement = replacement;
        this.recursionAbort = recursionAbort;
        this.matches = matches;
    }
}
class CodePatcherResult {
    successfulInjections;
    successfulReplacements;
    failedInjections;
    failedReplacements;
    sourceCode;
    patchedCode;
    successrate;
    constructor(successfulInjections, successfulReplacements, failedInjections, failedReplacements, sourceCode, patchedCode) {
        this.successfulInjections = successfulInjections;
        this.successfulReplacements = successfulReplacements;
        this.failedInjections = failedInjections;
        this.failedReplacements = failedReplacements;
        this.sourceCode = sourceCode;
        this.patchedCode = patchedCode;
        this.successrate = (successfulReplacements.length + successfulInjections.length) + 100 / (successfulReplacements.length + successfulInjections.length + failedReplacements.length + failedReplacements.length);
    }
}
class CodePatcher {
    sourceCode;
    debug;
    injections;
    replacements;
    lastResult = null;
    constructor(source, injections, replacements, debug = true) {
        this.replacements = replacements;
        this.injections = injections;
        this.debug = debug;
        this.sourceCode = source.trim();
    }
    process() {
        let patch = this.sourceCode;
        let successfulInjections = [];
        let successfulReplacements = [];
        let failedInjections = [];
        let failedReplacements = [];
        for (const injection of this.injections) {
            let originalOccurences = [...this.sourceCode.matchAll(injection.injectionPositionRegex)].length;
            let matches = new Array();
            let recursionAbort = false;
            let match;
            while ((match = injection.injectionPositionRegex.exec(patch)) != null && !recursionAbort) {
                matches.push({ original: match[0], result: "" });
                let beforeInsert = patch.slice(0, match.index + match[1].length);
                let afterInsert = patch.slice(match.index + match[1].length);
                patch = beforeInsert + "\n" + injection.injectionCode + afterInsert;
                if (matches.length > 10 * originalOccurences)
                    recursionAbort = true;
            }
            const result = new PatchInjectionResult(injection, matches, recursionAbort);
            if (matches.length > 0)
                successfulInjections.push(result);
            else
                failedInjections.push(result);
        }
        for (const replacement of this.replacements) {
            let matches = new Array();
            let target = replacement.targetRegex.exec(patch);
            if (target != null) {
                patch = patch.replaceAll(replacement.sourceRegex, match => {
                    matches.push({ original: match, result: target[1] });
                    return target[1];
                });
            }
            const result = new PatchReplacementResult(replacement, matches, false);
            if (matches.length > 0)
                successfulReplacements.push(result);
            else
                failedReplacements.push(result);
        }
        const result = new CodePatcherResult(successfulInjections, successfulReplacements, failedInjections, failedReplacements, this.sourceCode, patch);
        return result;
    }
}
let replacements = [];
let injections = [];
const loadProfile = (name) => {
    const profile = localStorage["savedProfile_" + name];
    if (profile != "") {
        const settings = JSON.parse(profile);
        settings.replacements?.forEach((repdata) => {
            const replacement = new PatchReplacement(repdata.source, repdata.target);
            console.log("Loaded replacement: ", replacement);
            replacements.push(replacement);
        });
        settings.injections?.forEach((injdata) => {
            const injection = new PatchInjection(injdata.code, injdata.position);
            console.log("Loaded replacement: ", injection);
            injections.push(injection);
        });
    }
};
const saveProfile = (name) => {
    const settings = {
        replacements: replacements.map(rep => {
            return { source: rep.sourceRegex.source, target: rep.targetRegex.source };
        }),
        injections: injections.map(inj => {
            return { code: inj.injectionCode, position: inj.injectionPositionRegex.source };
        })
    };
    localStorage["savedProfile_" + name] = JSON.stringify(settings);
};
document.addEventListener("DOMContentLoaded", () => {
    elements.addReplacement.addEventListener("click", event => {
        const target = elements.replaceTarget.value;
        const source = elements.replaceSource.value;
        const rep = new PatchReplacement(source, target);
        rep.listItem.addEventListener("click", () => {
            replacements = replacements.filter(item => item != rep);
            rep.listItem.remove();
            elements.replaceSource.value = rep.sourceRegex.source;
            elements.replaceTarget.value = rep.targetRegex.source;
        });
        replacements.push(rep);
        console.log("Added replacement: ", rep);
    });
    elements.addInjection.addEventListener("click", event => {
        const code = elements.injectCode.value;
        const position = elements.injectAtRegex.value;
        const inj = new PatchInjection(code, position);
        inj.listItem.addEventListener("click", () => {
            injections = injections.filter(item => item != inj);
            inj.listItem.remove();
            elements.injectAtRegex.value = inj.injectionPositionRegex.source;
            elements.injectCode.value = inj.injectionCode;
        });
        injections.push(inj);
        console.log("Added Injection: ", inj);
    });
    elements.patchCode.addEventListener("click", event => {
        const patcher = new CodePatcher(elements.inputCode.value, injections, replacements);
        const result = patcher.process();
        console.log("Patch done: ", result);
        elements.outputCode.value = result.patchedCode;
    });
    const saveElements = [elements.injectAtRegex, elements.injectCode, elements.replaceSource, elements.replaceTarget, elements.inputCode];
    saveElements.forEach(input => input.value = localStorage[input.id] ? localStorage[input.id] : "");
    window.onbeforeunload = () => {
        saveElements.forEach(input => {
            localStorage[input.id] = input.value;
        });
    };
    document.addEventListener("keydown", event => {
        if (event.key == "S") {
            const profile = prompt("Saving profile - enter name: ");
            saveProfile(profile);
        }
        else if (event.key == "L") {
            const found = Object.keys(localStorage).filter(key => key.includes("savedProfile_")).join(", ").replaceAll("savedProfile_", "");
            const profile = prompt("Loading profile - enter name: \nFound Profiles:\n" + found);
            loadProfile(profile);
        }
    });
});
//# sourceMappingURL=script.js.map