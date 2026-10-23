// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import ErrorPage from "./error";

afterEach(cleanup);

it("lets the user retry a failed route and provides a home exit", () => {
  const retry = vi.fn();
  render(createElement(ErrorPage, { retry }));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("link", { name: "Go home" }).getAttribute("href"),
  ).toBe("/");
});
