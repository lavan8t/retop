/**
 * Registers a DOM in the test runner.
 *
 * The teardown module works on the live document, so it can only be tested
 * against a real one.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (typeof globalThis.document === "undefined") {
  GlobalRegistrator.register({ url: "https://vtop.vit.ac.in/" });
}
