declare module "jstat" {
  interface JStatDist {
    inv: (...args: number[]) => number;
    cdf: (...args: number[]) => number;
    pdf: (...args: number[]) => number;
  }
  export const jStat: {
    normal: JStatDist;
    studentt: JStatDist;
  };
  const _default: typeof jStat;
  export default _default;
}
