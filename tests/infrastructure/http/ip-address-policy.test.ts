import { describe, expect, test } from "bun:test"
import { isPublicIpAddress } from "../../../src/infrastructure/http/ip-address-policy.js"

describe("IP address policy", () => {
  test.each([
    "0.0.0.0",
    "10.0.0.1",
    "127.0.0.1",
    "192.168.1.1",
    "240.0.0.1",
    "255.255.255.255",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false)
  })

  test("allows globally routable addresses", () => {
    expect(isPublicIpAddress("93.184.216.34")).toBe(true)
    expect(isPublicIpAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(true)
  })
})
