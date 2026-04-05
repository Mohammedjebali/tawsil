import { test, expect } from "@playwright/test";

const BASE = "https://www.tawsildelivery.com";

test("Google OAuth user can place an order via API", async ({ request }) => {
  // Fetch stores to get a real store
  const storesRes = await request.get(`${BASE}/api/stores`);
  const storesData = await storesRes.json();
  const aziza = (storesData.stores || []).find((s: { name: string }) =>
    s.name.toLowerCase().includes("aziza")
  );
  console.log("Found store:", aziza ? aziza.name : "NOT FOUND");

  const orderPayload = {
    customer_name: "Test User",
    customer_phone: "+21655123456",
    customer_address: "123 Test Street, Grombalia",
    customer_lat: null,
    customer_lng: null,
    store_id: aziza?.id || null,
    store_name: aziza?.name || "Aziza",
    store_address: aziza?.address || null,
    store_lat: aziza?.lat || null,
    store_lng: aziza?.lng || null,
    items_description: "2x Milk, 1x Bread, 1x Eggs",
    estimated_amount: null,
  };

  console.log("\n========== REQUEST PAYLOAD ==========");
  console.log(JSON.stringify(orderPayload, null, 2));

  const apiResponse = await request.post(`${BASE}/api/orders`, {
    data: orderPayload,
  });

  const status = apiResponse.status();
  let body: Record<string, unknown>;
  try {
    body = await apiResponse.json();
  } catch {
    body = { raw: await apiResponse.text() };
  }

  console.log("\n========== POST /api/orders RESPONSE ==========");
  console.log("Status:", status);
  console.log("Body:", JSON.stringify(body, null, 2));

  if (status === 500) {
    console.error("\n>>> 500 INTERNAL SERVER ERROR <<<");
    console.error("Error:", body.error || JSON.stringify(body));
  }
  if (status === 400) {
    console.error("\n>>> 400 BAD REQUEST <<<");
    console.error("Missing fields:", body.error || JSON.stringify(body));
  }

  expect(status, `Expected 200 but got ${status}: ${JSON.stringify(body)}`).toBe(200);
  expect(body).toHaveProperty("order");
});

test("Google OAuth user can place an order via UI", async ({ page }) => {
  // Set up localStorage BEFORE navigating
  await page.context().addInitScript(() => {
    localStorage.setItem(
      "tawsil_user",
      JSON.stringify({
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        email: "testorder@gmail.com",
        phone: "+21655123456",
        role: "customer",
      })
    );
  });

  await page.goto("/app");

  // Wait for splash to auto-dismiss and store list to appear
  const searchInput = page.locator("input[placeholder]").first();
  await searchInput.waitFor({ state: "visible", timeout: 30_000 });

  // Step 1: Select store
  await searchInput.fill("Aziza");
  await page.waitForTimeout(1000);
  const storeButton = page.locator("button").filter({ hasText: /Aziza/i }).first();
  await storeButton.waitFor({ state: "visible", timeout: 10_000 });
  await storeButton.click();

  // Step 2: Fill items
  const itemsTextarea = page.locator("textarea").first();
  await itemsTextarea.waitFor({ state: "visible", timeout: 5_000 });
  await itemsTextarea.fill("2x Milk, 1x Bread, 1x Eggs");
  await page.locator("button").filter({ hasText: /continue|متابعة|التالي|continuer/i }).first().click();

  // Step 3: Fill address
  const addressTextarea = page.locator("textarea").first();
  await addressTextarea.waitFor({ state: "visible", timeout: 5_000 });
  await addressTextarea.fill("123 Test Street, Grombalia");
  await page.locator("button").filter({ hasText: /continue|متابعة|التالي|continuer/i }).first().click();

  // Step 4: Confirm — capture the API response
  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes("/api/orders") && resp.request().method() === "POST",
      { timeout: 20_000 }
    ),
    page.locator("button").filter({ hasText: /confirm|تأكيد|confirmer|onsfirm/i }).first().click(),
  ]);

  const status = apiResponse.status();
  let body: Record<string, unknown>;
  try {
    body = await apiResponse.json();
  } catch {
    body = { raw: await apiResponse.text() };
  }

  console.log("\n========== UI TEST — POST /api/orders ==========");
  console.log("Status:", status);
  console.log("Body:", JSON.stringify(body, null, 2));

  if (status === 500) {
    console.error("\n>>> 500 INTERNAL SERVER ERROR <<<");
    console.error("Error:", body.error || JSON.stringify(body));
  }

  expect(status, `Expected 200 but got ${status}: ${JSON.stringify(body)}`).toBe(200);
  expect(body).toHaveProperty("order");
});
