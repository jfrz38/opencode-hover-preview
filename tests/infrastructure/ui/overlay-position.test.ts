import { describe, expect, test } from "bun:test"
import { positionOverlay } from "../../../src/infrastructure/ui/overlay-position.js"

describe("overlay positioning", () => {
  test("places the overlay beside the pointer when space is available", () => {
    expect(positionOverlay({ x: 10, y: 4 }, { width: 100, height: 30 }, { width: 20, height: 8 })).toEqual({
      x: 12,
      y: 5,
    })
  })

  test("keeps the overlay inside the viewport", () => {
    expect(positionOverlay({ x: 95, y: 29 }, { width: 100, height: 30 }, { width: 20, height: 8 })).toEqual({
      x: 80,
      y: 22,
    })
  })
})
