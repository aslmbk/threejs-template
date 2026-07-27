/// <reference types="vite/client" />

// Extensions handled by vite-plugin-glsl. Keep in sync with its defaults —
// importing a .vert or .frag without a declaration here fails the type-check
// even though the bundle builds fine.
declare module "*.glsl" {
  const shaderSource: string;
  export default shaderSource;
}

declare module "*.vert" {
  const shaderSource: string;
  export default shaderSource;
}

declare module "*.frag" {
  const shaderSource: string;
  export default shaderSource;
}

declare module "*.vs" {
  const shaderSource: string;
  export default shaderSource;
}

declare module "*.fs" {
  const shaderSource: string;
  export default shaderSource;
}
