// The manifest every snippet in src/snippets/ is built with, shared by capture.mjs and
// check-captures.mjs so the two run exactly the same project.
export const SNIPPET_MODULE_NAME = (name) => name.replaceAll('-', '_');
export const RECEIPT_SEND = ' sends receipt to register';

export const MANIFEST_TEXT = (name) => `[module]
name    = "${SNIPPET_MODULE_NAME(name)}"
sources = ["src/main.dz"]

[dependencies]
std = { open = true }

[build]
output = "executable"
`;
