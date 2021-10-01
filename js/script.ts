const elements = {
    replacementsView: document.querySelector("#replacementsView"),
    injectionsView: document.querySelector("#injectionsView"),
    addReplacement: document.querySelector("#addReplacement"),
    addInjection: document.querySelector("#addInjection"),
    replaceTarget: document.querySelector("#replaceTarget") as HTMLInputElement,
    replaceSource: document.querySelector("#replaceSource") as HTMLInputElement,
    injectCode: document.querySelector("#injectCode") as HTMLTextAreaElement,
    injectAtRegex: document.querySelector("#injectAtRegex") as HTMLInputElement,
    patchCode: document.querySelector("#patchCode") as HTMLButtonElement,
    inputCode: document.querySelector("#inputCode") as HTMLTextAreaElement,
    outputCode: document.querySelector("#outputCode") as HTMLTextAreaElement,
}

class PatchReplacement{
    listItem: Element;
    sourceRegex: RegExp;
    targetRegex: RegExp;

    constructor(source: string, target: string){
        this.sourceRegex = new RegExp(source,"g");
        this.targetRegex = new RegExp(target,"g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Replace <code>" + source + "</code> to <code>" + target + "</code>";
        elements.replacementsView.appendChild(this.listItem);
    }
}

class PatchInjection{
    listItem: Element;
    injectionCode: string;
    injectionPositionRegex: RegExp;

    constructor(code: string, position: string){
        this.injectionCode = code.trim();
        this.injectionPositionRegex = new RegExp(position,"g");
        this.listItem = document.createElement("li");
        this.listItem.innerHTML = "Before first group of <code>" + position + "</code> insert <code>" + code.substr(0,100) + "</code>";
        elements.injectionsView.appendChild(this.listItem);
    }
}

class PatchInjectionResult {
    matches: Array<{original: string, result: string}>;
    recursionAbort: boolean;
    injection: PatchInjection;
    constructor(injection: PatchInjection, matches: Array<{original: string, result: string}>, recursionAbort: boolean){
        this.injection = injection;
        this.recursionAbort = recursionAbort;
        this.matches = matches;
    }
}

class PatchReplacementResult {
    matches: Array<{original: string, result: string}>;
    recursionAbort: boolean;
    replacement: PatchReplacement;
    constructor(replacement: PatchReplacement, matches: Array<{original: string, result: string}>, recursionAbort: boolean){
        this.replacement = replacement;
        this.recursionAbort = recursionAbort;
        this.matches = matches;
    }
}

class CodePatcherResult{
    successfulInjections: PatchInjectionResult[];
    successfulReplacements: PatchReplacementResult[];
    failedInjections: PatchInjectionResult[];
    failedReplacements: PatchReplacementResult[];
    sourceCode: string;
    patchedCode: string;
    successrate: number;

    constructor(successfulInjections: PatchInjectionResult[], successfulReplacements: PatchReplacementResult[], failedInjections: PatchInjectionResult[], failedReplacements: PatchReplacementResult[], sourceCode: string, patchedCode: string){
        this.successfulInjections = successfulInjections;
        this.successfulReplacements = successfulReplacements;
        this.failedInjections = failedInjections;
        this.failedReplacements = failedReplacements;
        this.sourceCode = sourceCode;
        this.patchedCode = patchedCode;
        this.successrate = (successfulReplacements.length + successfulInjections.length) + 100 / (successfulReplacements.length + successfulInjections.length + failedReplacements.length + failedReplacements.length);
    }
}

class CodePatcher{
    sourceCode: string;
    debug: boolean;
    injections: PatchInjection[];
    replacements: PatchReplacement[];
    lastResult: CodePatcherResult = null;

    constructor(source: string, injections: PatchInjection[], replacements: PatchReplacement[], debug: boolean = true){
        this.replacements = replacements;
        this.injections = injections;
        this.debug = debug;
        this.sourceCode = source.trim();
    }

    process(){
        let patch = this.sourceCode;
        let successfulInjections: PatchInjectionResult[] = [];
        let successfulReplacements: PatchReplacementResult[] = [];
        let failedInjections: PatchInjectionResult[] = [];
        let failedReplacements: PatchReplacementResult[] = [];

        for (const injection of this.injections) {
            let originalOccurences = [...this.sourceCode.matchAll(injection.injectionPositionRegex)].length;
            let matches = new Array<{original: string, result: string}>();
            let recursionAbort = false;
            let match;

            while((match = injection.injectionPositionRegex.exec(patch)) != null && !recursionAbort){
                matches.push({original: match[0], result:""});
                let beforeInsert = patch.slice(0,match.index + match[1].length);
                let afterInsert = patch.slice(match.index + match[1].length);
                patch = beforeInsert + "\n" + injection.injectionCode + afterInsert;
                if(matches.length > 10 * originalOccurences) recursionAbort = true;
            }

            const result = new PatchInjectionResult(injection, matches, recursionAbort);
            if(matches.length > 0) successfulInjections.push(result);
            else failedInjections.push(result);
        }

        for (const replacement of this.replacements) {
            let matches = new Array<{original: string, result: string}>();
            let target = replacement.targetRegex.exec(patch);
            if(target != null){
                patch = patch.replaceAll(replacement.sourceRegex, match => {
                    matches.push({original: match, result: target[1]});
                    return target[1];
                });
            }
            const result = new PatchReplacementResult(replacement, matches, false);
            if(matches.length > 0) successfulReplacements.push(result);
            else failedReplacements.push(result);
        }

        const result = new CodePatcherResult(
            successfulInjections, 
            successfulReplacements, 
            failedInjections, 
            failedReplacements, 
            this.sourceCode, 
            patch
        );
        return result;
    }
}

let replacements: PatchReplacement[] = [];
let injections: PatchInjection[] = [];

const loadProfile = (name:string) => {
    const profile = localStorage["savedProfile_" + name];
    if(profile != ""){
        const settings = JSON.parse(profile);
        settings.replacements?.forEach((repdata: {source: string, target:string}) => {
           const replacement = new PatchReplacement(repdata.source, repdata.target);
           console.log("Loaded replacement: ", replacement);
           replacements.push(replacement);
        });
        settings.injections?.forEach((injdata: {code: string, position:string}) => {
            const injection = new PatchInjection(injdata.code, injdata.position);
            console.log("Loaded replacement: ", injection);
            injections.push(injection);
         });
    }
}
const saveProfile = (name:string) => {
    const settings = {
        replacements: replacements.map(rep => {
            return {source: rep.sourceRegex.source, target: rep.targetRegex.source}
        }),
        injections: injections.map(inj => {
            return {code: inj.injectionCode, position: inj.injectionPositionRegex.source}
        })
    }
    localStorage["savedProfile_" + name] = JSON.stringify(settings);
}

document.addEventListener("DOMContentLoaded", () => {
    elements.addReplacement.addEventListener("click", event => {
        const target = elements.replaceTarget.value;
        const source = elements.replaceSource.value;
        const rep = new PatchReplacement(source, target);
        rep.listItem.addEventListener("click", ()=>{
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
        inj.listItem.addEventListener("click", ()=>{
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

    const saveElements = [elements.injectAtRegex,elements.injectCode,elements.replaceSource, elements.replaceTarget,elements.inputCode];
    saveElements.forEach(input => input.value = localStorage[input.id]);
    window.onbeforeunload = ()=>{
        saveElements.forEach(input=>{
            localStorage[input.id] = input.value;
        });
    }

    document.addEventListener("keydown", event => {
        if(event.key == "S"){
            const profile = prompt("Saving profile - enter name: ");
            saveProfile(profile);
        }
        else if(event.key == "L"){
            const found = Object.keys(localStorage).filter(key => key.includes("savedProfile_")).join(", ").replaceAll("savedProfile_","");
            const profile = prompt("Loading profile - enter name: \nFound Profiles:\n" + found);
            loadProfile(profile);
        }
    })
});