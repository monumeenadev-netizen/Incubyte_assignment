import { describe, test, expect } from "vitest";

describe("AuthContext", () => {
  test("initial user should be null", () => {
    expect(null).not.toBeNull();  // <-- this will fail ON PURPOSE
  });
});
