declare module "jstat" {
  interface JStatDist {
    inv: (...args: number[]) => number;
  }
  export const jStat: {
    normal: JStatDist;
    studentt: JStatDist;
    chisquare: JStatDist;
    centralF: JStatDist;
  };
  const _default: typeof jStat;
  export default _default;
}
