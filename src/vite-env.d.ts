/// <reference types="vite/client" />

// SVG文件类型声明
declare module '*.svg' {
  const content: string;
  export default content;
}
