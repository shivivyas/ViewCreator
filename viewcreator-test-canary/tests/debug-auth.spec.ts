import { test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test("debug sign-up with clerk testing token", async ({ page }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Check cookies
  const cookies = await page.context().cookies();
  console.log("Cookies:", cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(", "));

  const signUpBtn = page.getByRole("button", { name: "Sign up", exact: true });
  await signUpBtn.click();

  await page.waitForTimeout(5000);
  console.log("URL after click:", page.url());
  console.log("Dialog:", await page.locator("dialog").count());
});
