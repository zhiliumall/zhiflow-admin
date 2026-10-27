import { validatenull } from "@/utils/validate";
/**
 * 过滤空值
 * @param form 表单数据
 */
export const filterForm = (form, _options?: unknown) => {
  const obj = {};
  Object.keys(form).forEach((ele) => {
    if (!validatenull(form[ele])) {
      obj[ele] = form[ele];
    }
  });
  return obj;
};

/**
 * list对象去重（根据对象的ID去重）
 * @param arr
 * @returns {*}
 */
export const unique = (arr) => {
  const res = new Map();
  return arr.filter((arr) => !res.has(arr.id) && res.set(arr.id, 1));
};

/**
 * @param {Array} arr
 * @returns {Array}
 */
export function uniqueArr(arr) {
  return Array.from(new Set(arr));
}

/**
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {Array}
 */
export function diffArray(arr1, arr2) {
  arr1 = uniqueArr(arr1);
  arr2 = uniqueArr(arr2);
  return arr1
    .concat(arr2)
    .filter((arg) => !(arr1.includes(arg) && arr2.includes(arg)));
}

