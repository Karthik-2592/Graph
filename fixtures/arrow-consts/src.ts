export const viaArrow = () => { helper(); };
export const local = () => {};
export function usesLocal() { local(); viaArrow(); }
export const multiLine = () => {
  helper();
};
export class K {
  run = () => { helper(); };
  m() { helper(); }
}
export function viaFn() { helper(); }
function helper() {}
