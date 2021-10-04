import * as pX from "./patchEx.js";

const elements = {
    addReplacement: document.querySelector("#addReplacement"),
    addInjection: document.querySelector("#addInjection"),
    replaceTarget: document.querySelector("#replaceTarget") as HTMLInputElement,
    replaceSource: document.querySelector("#replaceSource") as HTMLInputElement,
    injectCode: document.querySelector("#injectCode") as HTMLTextAreaElement,
    injectAtRegex: document.querySelector("#injectAtRegex") as HTMLInputElement,
    patchCode: document.querySelector("#patchCode") as HTMLButtonElement,
    inputCode: document.querySelector("#inputCode") as HTMLTextAreaElement,
    outputCode: document.querySelector("#outputCode") as HTMLTextAreaElement,
    currentGroup: document.querySelector("#currentGroupView") as HTMLDivElement,
    groups: document.querySelector("#groupsView") as HTMLDivElement,
    addGroup: document.querySelector("#addGroup") as HTMLButtonElement,
    deleteGroup: document.querySelector("#deleteGroup") as HTMLButtonElement
}

let processor = new pX.PatchProcessor(elements.groups, elements.currentGroup);

const loadProfile = (name:string) => {
    const profile = localStorage["savedProfile_" + name];
    if(profile != ""){
        const settings = processor.importConfig(profile);
    }
}
const saveProfile = (name:string) => {
    const settings = processor.exportConfig();
    localStorage["savedProfile_" + name] = settings;
}
const addInjection = (position: string, code: string) => {
    if(processor.currentGroup<0) alert("Add a group first!");
    const inj = new pX.PatchInjection(code, position);
    const addGroup = processor.currentGroup;
    inj.onclick = () => {
        processor.getGroup(addGroup).patcher.injections = 
            processor.getGroup(addGroup).patcher.injections.filter(added => added != inj);
        processor.updateGroupDetails(addGroup);
        processor.updateGroupView();
        elements.injectAtRegex.value = position;
        elements.injectCode.value = code;
    }
    processor.getGroup(processor.currentGroup).patcher.injections.push(inj);
    processor.updateGroupDetails(processor.currentGroup);
    processor.updateGroupView();
    console.log("Added Injection: ", inj);
}
const addReplacement = (source: string, target: string) => {
    if(processor.currentGroup<0) alert("Add a group first!");
    const rep = new pX.PatchReplacement(source, target);
    const addGroup = processor.currentGroup;
    rep.onclick = () => {
        processor.getGroup(addGroup).patcher.replacements = 
            processor.getGroup(addGroup).patcher.replacements.filter(added => added != rep);
        processor.updateGroupDetails(addGroup);
        processor.updateGroupView();
        elements.replaceSource.value = source;
        elements.replaceTarget.value = target;
    }
    processor.getGroup(processor.currentGroup).patcher.replacements.push(rep);
    processor.updateGroupDetails(processor.currentGroup);
    processor.updateGroupView();
    console.log("Added Replacement: ", rep);
}

document.addEventListener("DOMContentLoaded", () => {
    
    elements.addGroup.addEventListener("click", ()=>{
        const name = prompt("Enter a group name:");
        let added = processor.addGroup(new pX.CodePatcher([],[]), name);
        processor.selectGroup(added);
    });
    
    elements.deleteGroup.addEventListener("click", ()=>{
        const grp = processor.getGroup(processor.currentGroup);
        const remove = confirm("This will delete the group '" + grp.name + "'");
        if(remove) {
            processor.removeGroup(grp.id);
            processor.selectGroup(processor.patchGroups[0].id);
        }
    });

    elements.addReplacement.addEventListener("click", event => {
        const target = elements.replaceTarget.value;
        const source = elements.replaceSource.value;
        addReplacement(source,target);
    });

    elements.addInjection.addEventListener("click", event => {
        const code = elements.injectCode.value;
        const position = elements.injectAtRegex.value;
        addInjection(position, code);
    });

    elements.patchCode.addEventListener("click", event => {
        const result = processor.process(elements.inputCode.value);
        console.log("Patch done: ", result);
        alert("Done! Stats:\n - Replacements failed: " + result.failedReplacements.length.toString() 
            + "\n - Injections failed: " + result.failedReplacements.length.toString());
        elements.outputCode.value = result.patchedCode;
    });

    const saveElements = [elements.injectAtRegex,elements.injectCode,elements.replaceSource, elements.replaceTarget,elements.inputCode];
    saveElements.forEach(input => input.value = localStorage[input.id] ? localStorage[input.id] : "");
    window.onbeforeunload = ()=>{
        saveElements.forEach(input=>{
            localStorage[input.id] = input.value;
        });
    }

    document.addEventListener("keydown", event => {
        if(event.key.toUpperCase() == "S" && event.altKey){
            const profile = prompt("Saving profile - enter name: ");
            saveProfile(profile);
        } else if(event.key.toUpperCase() == "L" && event.altKey){
            const found = Object.keys(localStorage).filter(key => key.includes("savedProfile_")).join(", ").replaceAll("savedProfile_","");
            const profile = prompt("Loading profile - enter name: \nFound Profiles:\n" + found);
            loadProfile(profile);
        } else if(event.key.toUpperCase() == "I" && event.altKey){
            const injection = JSON.parse(prompt("Adding injection - paste JSON:"));
            addInjection(injection.position, injection.code);
        } else if(event.key.toUpperCase() == "R" && event.altKey){
            const replacement = JSON.parse(prompt("Adding replacement - paste JSON:"));
            addReplacement(replacement.source, replacement.target);
        }
        else if(event.key.toUpperCase() == "C" && event.altKey){
            navigator.clipboard.writeText(processor.exportConfig());
            alert("Copied JSON to clipboard.")
        }
        else if(event.key.toUpperCase() == "V" && event.altKey){
            processor.importConfig(prompt("Enter config JSON:"));
        }
    })
});