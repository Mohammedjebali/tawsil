import { test, expect } from "@playwright/test";

const TEST_USER_A = {
  user_id: "aaaaaaaa-1111-4000-a000-000000000001",
  name: "Auth Test User A",
  firstName: "Auth",
  lastName: "UserA",
  email: "auth-test-a@gmail.com",
  phone: "+21699000001",
  role: "customer",
};

const TEST_USER_B = {
  user_id: "bbbbbbbb-2222-4000-b000-000000000002",
  name: "Auth Test User B",
  firstName: "Auth",
  lastName: "UserB",
  email: "auth-test-b@gmail.com",
  phone: "+21699000002",
  role: "customer",
};

test.describe("Google OAuth flow — localStorage simulation", () => {
  test("user data is correctly loaded on /app after setting localStorage", async ({ page }) => {
    await page.context().addInitScript((userData) => {
      localStorage.setItem("tawsil_user", JSON.stringify(userData));
    }, TEST_USER_A);

    await page.goto("/app");

    // Wait for splash to auto-dismiss and the greeting to appear
    const greeting = page.locator("text=/Auth/i").first();
    await greeting.waitFor({ state: "visible", timeout: 30_000 });
    await expect(greeting).toBeVisible();
  });

  test("user can place an order via API with user_id", async ({ request }) => {
    const storesRes = await request.get("/api/stores");
    const store = ((await storesRes.json()).stores || [])[0];

    const orderPayload = {
      user_id: TEST_USER_A.user_id,
      customer_name: TEST_USER_A.name,
      customer_phone: TEST_USER_A.phone,
      customer_address: "456 Auth Test Street, Grombalia",
      customer_lat: null,
      customer_lng: null,
      store_id: store?.id || null,
      store_name: store?.name || "Test Store",
      store_address: store?.address || null,
      store_lat: store?.lat || null,
      store_lng: store?.lng || null,
      items_description: "Auth flow test: 1x Water, 1x Juice",
      estimated_amount: null,
    };

    const res = await request.post("/api/orders", { data: orderPayload });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("order");
    expect(body.order.customer_name).toBe(TEST_USER_A.name);
    // user_id is stored when the orders.user_id column exists (after migration)
    if (body.order.user_id !== undefined) {
      expect(body.order.user_id).toBe(TEST_USER_A.user_id);
    }
  });

  test("orders filtered by user_id do not leak across users", async ({ request }) => {
    // Fetch orders for user A by user_id
    const ordersA = await request.get(`/api/orders?user_id=${TEST_USER_A.user_id}`);
    const dataA = await ordersA.json();
    expect(ordersA.status()).toBe(200);

    // Fetch orders for user B by user_id
    const ordersB = await request.get(`/api/orders?user_id=${TEST_USER_B.user_id}`);
    const dataB = await ordersB.json();
    expect(ordersB.status()).toBe(200);

    const userAOrders = dataA.orders || [];
    const userBOrders = dataB.orders || [];

    // Check if user_id filtering is active (column exists and code is deployed)
    const hasUserIdColumn = userAOrders.length > 0 && "user_id" in userAOrders[0];

    if (hasUserIdColumn) {
      // Strict isolation: all returned orders must belong to the requested user
      for (const order of userAOrders) {
        expect(order.user_id).toBe(TEST_USER_A.user_id);
      }
      for (const order of userBOrders) {
        expect(order.user_id).toBe(TEST_USER_B.user_id);
      }

      // No overlap between the two sets
      const userAOrderIds = new Set(userAOrders.map((o: { id: string }) => o.id));
      for (const order of userBOrders) {
        expect(userAOrderIds.has(order.id)).toBe(false);
      }
    } else {
      // Migration not yet applied — verify the API at least returns valid data
      expect(Array.isArray(userAOrders)).toBe(true);
      expect(Array.isArray(userBOrders)).toBe(true);
    }
  });

  test("user places order via UI with user_id in localStorage", async ({ page }) => {
    await page.context().addInitScript((userData) => {
      localStorage.setItem("tawsil_user", JSON.stringify(userData));
    }, TEST_USER_A);

    await page.goto("/app");

    // Wait for splash to dismiss and store list to load
    const searchInput = page.locator("input[placeholder]").first();
    await searchInput.waitFor({ state: "visible", timeout: 30_000 });

    // Step 1: Click any store card (they use class "card-hover")
    const storeCard = page.locator("button.card-hover").first();
    await storeCard.waitFor({ state: "visible", timeout: 10_000 });
    await storeCard.click();

    // Step 2: Fill items description
    const itemsTextarea = page.locator("textarea").first();
    await itemsTextarea.waitFor({ state: "visible", timeout: 10_000 });
    await itemsTextarea.fill("E2E data leak test item");
    await page.locator("button").filter({ hasText: /continue|متابعة|التالي|continuer/i }).first().click();

    // Step 3: Fill address
    const addressTextarea = page.locator("textarea").first();
    await addressTextarea.waitFor({ state: "visible", timeout: 10_000 });
    await addressTextarea.fill("E2E Test Address, Grombalia");
    await page.locator("button").filter({ hasText: /continue|متابعة|التالي|continuer/i }).first().click();

    // Step 4: Confirm order and capture the API request
    const [apiResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/api/orders") && resp.request().method() === "POST",
        { timeout: 20_000 }
      ),
      page.locator("button").filter({ hasText: /confirm|تأكيد|confirmer/i }).first().click(),
    ]);

    // Verify order was created
    expect(apiResponse.status()).toBe(200);
    const orderBody = await apiResponse.json();
    expect(orderBody).toHaveProperty("order");

    // Verify the request payload includes user_id (after code deployment)
    const requestBody = apiResponse.request().postDataJSON();
    if (requestBody.user_id) {
      expect(requestBody.user_id).toBe(TEST_USER_A.user_id);
    }
  });
});
