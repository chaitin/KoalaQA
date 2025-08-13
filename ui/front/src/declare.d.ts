declare module "cvss";

declare module 'prettier-plugin-java'


declare class BMap {
  static Map: any;
  static Circle: any;
  static Point: any;
  static Marker: any;
  static Polygon: any;
}

// 图片文件类型声明
declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}

declare module "*.ico" {
  const value: string;
  export default value;
}
