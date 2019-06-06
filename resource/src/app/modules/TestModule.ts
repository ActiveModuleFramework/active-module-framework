import * as amf from "active-module-framework";

/**
 *テストモジュール
 *
 * @export
 * @class TestModule
 * @extends {amf.Module}
 */
export class TestModule extends amf.Module {
  async JS_add(a: number, b: number) {
    return a + b;
  }
}
