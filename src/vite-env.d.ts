/// <reference types="vite/client" />

declare module "*.glsl" {
  const shaderSource: string;
  export default shaderSource;
}
