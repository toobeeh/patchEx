class PatchReplacement {
    listItem;
    sourceRegex;
    targetRegex;
    onclick;
    clickhandler = (e) => {
        if (this.onclick)
            this.onclick(this, e);
    };
    constructor(source, target) {
        this.sourceRegex = new RegExp(source, "g");
        this.targetRegex = new RegExp(target, "g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Replace <code>" + source + "</code> to <code>" + target + "</code>";
        this.listItem.addEventListener("click", this.clickhandler);
    }
}
class PatchInjection {
    listItem;
    injectionCode;
    injectionPositionRegex;
    onclick;
    clickhandler = (e) => {
        if (this.onclick)
            this.onclick(this, e);
    };
    constructor(code, position) {
        this.injectionCode = code.trim();
        this.injectionPositionRegex = new RegExp(position, "g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Before first group of <code>" + position + "</code> insert <code>" + code.substr(0, 100) + "</code>";
        this.listItem.addEventListener("click", this.clickhandler);
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
    debug;
    injections;
    replacements;
    lastResult = null;
    constructor(injections, replacements, debug = true) {
        this.replacements = replacements;
        this.injections = injections;
        this.debug = debug;
    }
    process(sourceCode) {
        let patch = sourceCode;
        let successfulInjections = [];
        let successfulReplacements = [];
        let failedInjections = [];
        let failedReplacements = [];
        for (const injection of this.injections) {
            let originalOccurences = [...sourceCode.matchAll(injection.injectionPositionRegex)].length;
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
            else {
                failedReplacements.push(result);
                console.log("Replace patch failed: ", result);
            }
            ;
        }
        const result = new CodePatcherResult(successfulInjections, successfulReplacements, failedInjections, failedReplacements, sourceCode, patch);
        return result;
    }
}
class PatchProcessor {
    patchGroups;
    lastID;
    groupContainer;
    groupDetailContainer;
    currentGroup;
    constructor(container, detailContainer) {
        this.patchGroups = [];
        this.lastID = 0;
        this.groupContainer = container;
        this.groupDetailContainer = detailContainer;
        this.currentGroup = -1;
    }
    importConfig(config) {
        let configObject;
        try {
            configObject = JSON.parse(config);
        }
        catch (e) {
            throw new Error("Config is not compatible: " + e);
        }
        configObject.groups.forEach(group => {
            const injections = group.injections.map(injection => new PatchInjection(injection.code, injection.position));
            const replacements = group.replacements.map(replacement => new PatchReplacement(replacement.source, replacement.target));
            this.addGroup(new CodePatcher(injections, replacements), group.name);
        });
    }
    exportConfig() {
        let configObject = { groups: [] };
        this.patchGroups.forEach(group => {
            let injections = [];
            let replacements = [];
            group.patcher.injections.forEach(inj => injections.push({ position: inj.injectionPositionRegex.source, code: inj.injectionCode }));
            group.patcher.replacements.forEach(rep => replacements.push({ source: rep.sourceRegex.source, target: rep.targetRegex.source }));
            configObject.groups.push({ name: group.name, replacements: replacements, injections: injections });
        });
        return JSON.stringify(configObject);
    }
    updateGroupView() {
        this.groupContainer.innerHTML = "";
        this.patchGroups.forEach(group => {
            this.groupContainer.insertAdjacentHTML("beforeend", `<li><b>${group.name}:</b> ${group.patcher.injections.length} Injections, ${group.patcher.replacements.length} Replacements</li>`);
            this.groupContainer.lastElementChild.addEventListener("click", () => this.selectGroup(group.id));
        });
    }
    addGroup(patcher, name) {
        const details = document.createElement("ul");
        this.patchGroups.push({ id: ++this.lastID, name: name, element: this.groupContainer.lastElementChild, details: details, patcher: patcher });
        this.updateGroupDetails(this.lastID);
        this.updateGroupView();
        return this.lastID;
    }
    updateGroupDetails(id) {
        const group = this.getGroup(id);
        group.details.innerHTML = "<b>" + group.name + "</b>";
        group.patcher.injections.forEach(inj => group.details.appendChild(inj.listItem));
        group.patcher.replacements.forEach(rep => group.details.appendChild(rep.listItem));
    }
    removeGroup(id) {
        this.patchGroups = this.patchGroups.filter(group => group.id != id);
        this.updateGroupView();
    }
    getGroup(id) {
        return this.patchGroups.find(group => group.id == id);
    }
    selectGroup(id) {
        this.groupDetailContainer.innerHTML = "";
        this.groupDetailContainer.appendChild(this.getGroup(id).details);
        this.currentGroup = id;
    }
    changeOrder(reordered) {
        let reorderedGroups = [];
        reordered.forEach(num => {
            reorderedGroups.push(this.patchGroups.find(group => group.id == num));
        });
        this.patchGroups = reorderedGroups;
        this.updateGroupView();
    }
    groupToIndex(id, to) {
        let order = this.patchGroups.map(grp => grp.id);
        order = order.filter(grp => grp != id);
        order.splice(to, 0, id);
        this.changeOrder(order);
    }
    process(code) {
        let currentCode = code;
        let successfulInjections = [];
        let successfulReplacements = [];
        let failedInjections = [];
        let failedReplacements = [];
        this.patchGroups.forEach(group => {
            const groupResult = group.patcher.process(currentCode);
            successfulInjections = [...successfulInjections, ...groupResult.successfulInjections];
            failedInjections = [...failedInjections, ...groupResult.failedInjections];
            successfulReplacements = [...successfulReplacements, ...groupResult.successfulReplacements];
            failedReplacements = [...failedReplacements, ...groupResult.failedReplacements];
            console.log("Group: " + group.name, groupResult);
            currentCode = groupResult.patchedCode;
        });
        return new CodePatcherResult(successfulInjections, successfulReplacements, failedInjections, failedReplacements, code, currentCode);
    }
}
export { PatchReplacement, PatchInjection, PatchReplacementResult, PatchInjectionResult, CodePatcher, CodePatcherResult, PatchProcessor };
//# sourceMappingURL=patchEx.js.map