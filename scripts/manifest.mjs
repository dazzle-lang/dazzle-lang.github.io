// The manifest every snippet in src/snippets/ is built with, shared by capture.mjs and
// check-captures.mjs so the two run exactly the same project.
export const MANIFEST_TEXT = (name) => `[module]
name    = "${name}"
sources = ["src/**/*.dz"]

[dependencies]
std = { open = true }

[build]
output = "executable"
`;
