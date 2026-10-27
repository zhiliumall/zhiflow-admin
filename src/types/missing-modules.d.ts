declare module "vite-plugin-mock" {
  export type MockMethod = any;
  export function createProdMockServer(...args: any[]): any;
}

declare module "@smallwei/avue/lib/locale/lang/*" {
  const locale: Record<string, any>;
  export default locale;
}

declare module "@pureadmin/theme" {
  const theme: any;
  export default theme;
  export type multipleScopeVarsOptions = any;
  export const multipleScopeVarsOptions: any;
}
