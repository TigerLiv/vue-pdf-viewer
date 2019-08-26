export default class Utils {
  static getUniqueId(prefix = 'chart') {
    const rdn = Math.floor(Math.random() * 1000000000);
    return `${prefix}-${+new Date()}-${rdn}`;
  }
}
