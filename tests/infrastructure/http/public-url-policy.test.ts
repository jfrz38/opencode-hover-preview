import { describe, expect, test } from "bun:test"
import { validatePublicUrl } from "../../../src/infrastructure/http/public-url-policy.js"

const signal = () => new AbortController().signal

describe("public URL policy", () => {
  test("accepts public HTTP and HTTPS destinations on standard ports", async () => {
    const resolveHost = async () => ["93.184.216.34"]

    expect(
      await validatePublicUrl(new URL("https://example.com/docs"), resolveHost, signal()),
    ).toBeUndefined()
    expect(
      await validatePublicUrl(new URL("http://example.com:80"), resolveHost, signal()),
    ).toBeUndefined()
  })

  test.each([
    "http://127.0.0.1",
    "http://[::1]",
    "http://[fc00::1]",
    "http://[::ffff:127.0.0.1]",
  ])("rejects non-public destination %s", async (value) => {
    expect(
      await validatePublicUrl(new URL(value), async () => {
        throw new Error("Literal addresses must not use DNS")
      }, signal()),
    ).toBe("Local and private network addresses are not allowed.")
  })

  test("rejects private DNS results and unsupported URL features", async () => {
    expect(
      await validatePublicUrl(new URL("https://internal.test"), async () => ["10.0.0.1"], signal()),
    ).toBe("Local and private network addresses are not allowed.")
    expect(
      await validatePublicUrl(new URL("https://user:secret@example.com"), async () => ["93.184.216.34"], signal()),
    ).toBe("URLs with embedded credentials are not allowed.")
    expect(
      await validatePublicUrl(new URL("https://example.com:8443"), async () => ["93.184.216.34"], signal()),
    ).toBe("Only standard HTTP and HTTPS ports are allowed.")
  })
})
