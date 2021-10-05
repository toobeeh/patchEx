# patchEx
I desparately am in need of some tool that makes that utterly boring sourcecode patching after a skribbl.io update instead of me.  
This is designed to work in two fabulous ways:
- Inserting code after the first match group of a regex  
- Replacing text in the code to some values that are found via regex match groups.

So, my workflow is basically adding my code to the source and replacing constants in my code with values from the source found by the regex.  
Live at https://tobeh.host/patchEx

For usage & shortcuts visit the website.
For an example usage, load the skribblPatchConfig in ./js.  
This patch will work with skribbl's 2021 update in any beautified version.
