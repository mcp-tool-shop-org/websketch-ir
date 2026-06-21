/**
 * Realistic page fixture for WebSketch IR tests.
 *
 * Models an e-commerce dashboard page with:
 * - Header with nav, search bar, user menu
 * - Sidebar with nav links
 * - Main content area with product cards, data table, stats widgets
 * - Modal overlay
 * - Footer
 *
 * 50+ nodes covering mixed roles, handlers, bindings, state, text signals, and patterns.
 * All values are deterministic (no Date.now() or Math.random()).
 */

import { makeCapture, makeNode, makeText } from "./index.js";
import type { UINode } from "../../src/index.js";

// =============================================================================
// Helper: build product card
// =============================================================================

function productCard(index: number, x: number, y: number): UINode {
  return makeNode("CARD", [x, y, 0.2, 0.28] as const, {
    id: `product-card-${index}`,
    semantic: `product_${index}`,
    pattern: { kind: "product_card", name: `product-${index}` },
    style: { tokens: ["elevated"], density: "normal", size: "md" },
    handlers: [{ event: "click", intent: "navigate" }],
    state: [{ key: `products[${index}].selected`, access: "readwrite", scope: "local" }],
    children: [
      makeNode("IMAGE", [x + 0.01, y + 0.01, 0.18, 0.12] as const, {
        id: `product-img-${index}`,
        text: makeText("short", { hash: `prod_img_${index}`, len: 12 }),
      }),
      makeNode("TEXT", [x + 0.01, y + 0.14, 0.18, 0.03] as const, {
        id: `product-title-${index}`,
        text: makeText("short", { hash: `prod_title_${index}`, len: 18 }),
      }),
      makeNode("TEXT", [x + 0.01, y + 0.18, 0.18, 0.02] as const, {
        id: `product-price-${index}`,
        text: makeText("short", { hash: `prod_price_${index}`, len: 7 }),
        style: { tokens: ["primary"], size: "lg" },
      }),
      makeNode("BUTTON", [x + 0.04, y + 0.22, 0.12, 0.04] as const, {
        id: `product-cta-${index}`,
        interactive: true,
        enabled: true,
        semantic: "add_to_cart",
        text: makeText("short", { hash: `add_cart_${index}`, len: 11 }),
        style: { tokens: ["primary", "elevated"], size: "sm" },
        handlers: [{ event: "click", intent: "add_to_cart", target: `cart-badge` }],
        state: [{ key: "cart.items", access: "write", scope: "global" }],
        bindings: [{ property: "disabled", expression: `products[${index}].outOfStock` }],
      }),
    ],
  });
}

// =============================================================================
// Helper: build table row
// =============================================================================

function tableRow(index: number, yOffset: number): UINode {
  return makeNode("TEXT", [0.22, yOffset, 0.56, 0.03] as const, {
    id: `table-row-${index}`,
    flags: { repeated: true },
    text: makeText("sentence", { hash: `row_data_${index}`, len: 60 + index }),
    handlers: [{ event: "click", intent: "select_row" }],
  });
}

// =============================================================================
// Helper: build stat widget
// =============================================================================

function statWidget(index: number, x: number, label: string, value: string): UINode {
  return makeNode("CARD", [x, 0.12, 0.12, 0.08] as const, {
    id: `stat-widget-${index}`,
    pattern: { kind: "dashboard_widget", name: label },
    style: { tokens: ["outlined"], density: "compact", size: "sm" },
    state: [{ key: `stats.${label}`, access: "read", scope: "global" }],
    children: [
      makeNode("TEXT", [x + 0.01, 0.125, 0.1, 0.02] as const, {
        id: `stat-label-${index}`,
        text: makeText("short", { hash: `stat_lbl_${index}`, len: label.length }),
        style: { tokens: ["muted"], size: "xs" },
      }),
      makeNode("TEXT", [x + 0.01, 0.15, 0.1, 0.03] as const, {
        id: `stat-value-${index}`,
        text: makeText("short", { hash: `stat_val_${index}`, len: value.length }),
        style: { tokens: ["primary"], size: "lg" },
        bindings: [{ property: "text", expression: `stats.${label}` }],
      }),
    ],
  });
}

// =============================================================================
// Main fixture: realistic e-commerce dashboard
// =============================================================================

export const realisticPage = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    id: "page-root",
    children: [
      // -----------------------------------------------------------------------
      // HEADER
      // -----------------------------------------------------------------------
      makeNode("HEADER", [0, 0, 1, 0.06] as const, {
        id: "header",
        flags: { sticky: true },
        style: { tokens: ["inverted", "elevated"], density: "compact" },
        children: [
          // Logo
          makeNode("IMAGE", [0.01, 0.01, 0.06, 0.04] as const, {
            id: "logo",
            text: makeText("short", { hash: "logo_alt", len: 8 }),
            handlers: [{ event: "click", intent: "navigate", target: "home" }],
          }),
          // Primary nav
          makeNode("NAV", [0.08, 0.01, 0.3, 0.04] as const, {
            id: "primary-nav",
            semantic: "primary_nav",
            pattern: { kind: "nav_menu", name: "main-nav" },
            children: [
              makeNode("LINK", [0.08, 0.015, 0.06, 0.03] as const, {
                id: "nav-dashboard",
                interactive: true,
                text: makeText("short", { hash: "nav_dash", len: 9 }),
                style: { tokens: ["highlight"] },
              }),
              makeNode("LINK", [0.15, 0.015, 0.06, 0.03] as const, {
                id: "nav-products",
                interactive: true,
                text: makeText("short", { hash: "nav_prod", len: 8 }),
              }),
              makeNode("LINK", [0.22, 0.015, 0.06, 0.03] as const, {
                id: "nav-orders",
                interactive: true,
                text: makeText("short", { hash: "nav_orders", len: 6 }),
              }),
              makeNode("LINK", [0.29, 0.015, 0.06, 0.03] as const, {
                id: "nav-analytics",
                interactive: true,
                text: makeText("short", { hash: "nav_analytics", len: 9 }),
              }),
            ],
          }),
          // Search bar
          makeNode("FORM", [0.42, 0.01, 0.28, 0.04] as const, {
            id: "search-form",
            pattern: { kind: "search_bar", name: "global-search" },
            children: [
              makeNode("INPUT", [0.43, 0.015, 0.22, 0.03] as const, {
                id: "search-input",
                interactive: true,
                enabled: true,
                focusable: true,
                semantic: "search",
                text: makeText("short", { hash: "search_placeholder", len: 16 }),
                handlers: [
                  { event: "input", intent: "search_filter" },
                  { event: "keydown", intent: "submit_search" },
                ],
                bindings: [{ property: "value", expression: "search.query" }],
                state: [{ key: "search.query", access: "readwrite", scope: "global" }],
              }),
              makeNode("BUTTON", [0.66, 0.015, 0.03, 0.03] as const, {
                id: "search-btn",
                interactive: true,
                enabled: true,
                semantic: "search_submit",
                handlers: [{ event: "click", intent: "submit_search" }],
                style: { tokens: ["primary"], size: "sm" },
              }),
            ],
          }),
          // Cart icon
          makeNode("ICON", [0.82, 0.015, 0.03, 0.03] as const, {
            id: "cart-icon",
            interactive: true,
            semantic: "cart",
            handlers: [{ event: "click", intent: "toggle_cart" }],
            state: [{ key: "cart.count", access: "read", scope: "global" }],
            bindings: [{ property: "text", expression: "cart.count" }],
          }),
          // Notification bell
          makeNode("ICON", [0.86, 0.015, 0.03, 0.03] as const, {
            id: "notif-icon",
            interactive: true,
            semantic: "notifications",
            handlers: [{ event: "click", intent: "toggle_notifications" }],
            state: [{ key: "notifications.unreadCount", access: "read", scope: "global" }],
          }),
          // User menu
          makeNode("BUTTON", [0.9, 0.01, 0.08, 0.04] as const, {
            id: "user-menu-btn",
            interactive: true,
            semantic: "user_menu",
            text: makeText("short", { hash: "user_name", len: 10 }),
            handlers: [{ event: "click", intent: "toggle_menu" }],
            state: [{ key: "user.isLoggedIn", access: "condition", scope: "global" }],
          }),
        ],
      }),

      // -----------------------------------------------------------------------
      // SIDEBAR
      // -----------------------------------------------------------------------
      makeNode("NAV", [0, 0.06, 0.16, 0.88] as const, {
        id: "sidebar",
        semantic: "sidebar_nav",
        pattern: { kind: "nav_menu", variant: "sidebar" },
        style: { tokens: ["muted"], density: "compact" },
        children: [
          makeNode("LINK", [0.01, 0.08, 0.14, 0.04] as const, {
            id: "side-overview",
            interactive: true,
            text: makeText("short", { hash: "side_overview", len: 8 }),
            style: { tokens: ["highlight"] },
          }),
          makeNode("LINK", [0.01, 0.13, 0.14, 0.04] as const, {
            id: "side-inventory",
            interactive: true,
            text: makeText("short", { hash: "side_inventory", len: 9 }),
          }),
          makeNode("LINK", [0.01, 0.18, 0.14, 0.04] as const, {
            id: "side-reports",
            interactive: true,
            text: makeText("short", { hash: "side_reports", len: 7 }),
          }),
          makeNode("LINK", [0.01, 0.23, 0.14, 0.04] as const, {
            id: "side-settings",
            interactive: true,
            text: makeText("short", { hash: "side_settings", len: 8 }),
          }),
          makeNode("LINK", [0.01, 0.28, 0.14, 0.04] as const, {
            id: "side-support",
            interactive: true,
            text: makeText("short", { hash: "side_support", len: 7 }),
          }),
        ],
      }),

      // -----------------------------------------------------------------------
      // MAIN CONTENT AREA
      // -----------------------------------------------------------------------
      makeNode("SECTION", [0.17, 0.06, 0.83, 0.88] as const, {
        id: "main-content",
        semantic: "main",
        flags: { scrollable: true },
        children: [
          // Page title
          makeNode("TEXT", [0.18, 0.07, 0.4, 0.04] as const, {
            id: "page-title",
            text: makeText("short", { hash: "dashboard_title", len: 9 }),
            style: { tokens: ["primary"], size: "xl" },
          }),

          // Stat widgets row
          statWidget(0, 0.18, "revenue", "$12,450"),
          statWidget(1, 0.31, "orders", "342"),
          statWidget(2, 0.44, "visitors", "8,291"),
          statWidget(3, 0.57, "conversion", "4.1%"),

          // Product cards row
          makeNode("LIST", [0.18, 0.22, 0.62, 0.3] as const, {
            id: "product-list",
            semantic: "featured_products",
            children: [
              productCard(0, 0.18, 0.23),
              productCard(1, 0.39, 0.23),
              productCard(2, 0.60, 0.23),
            ],
          }),

          // Data table: recent orders
          makeNode("TABLE", [0.18, 0.54, 0.62, 0.3] as const, {
            id: "orders-table",
            semantic: "recent_orders",
            pattern: { kind: "data_table", name: "orders" },
            style: { tokens: ["outlined"], density: "compact" },
            state: [
              { key: "orders.list", access: "read", scope: "global" },
              { key: "orders.sortBy", access: "readwrite", scope: "url" },
            ],
            children: [
              // Table header
              makeNode("TEXT", [0.18, 0.545, 0.62, 0.03] as const, {
                id: "table-header",
                text: makeText("short", { hash: "table_hdr", len: 40 }),
                style: { tokens: ["muted", "monospace"], density: "compact" },
                handlers: [{ event: "click", intent: "sort_column" }],
              }),
              // Table rows
              tableRow(0, 0.58),
              tableRow(1, 0.61),
              tableRow(2, 0.64),
              tableRow(3, 0.67),
              tableRow(4, 0.70),
              // Pagination
              makeNode("PAGINATION", [0.35, 0.74, 0.28, 0.04] as const, {
                id: "table-pagination",
                interactive: true,
                handlers: [{ event: "click", intent: "change_page" }],
                state: [{ key: "orders.page", access: "readwrite", scope: "url" }],
                bindings: [{ property: "value", expression: "orders.page" }],
              }),
            ],
          }),

          // Paragraph description block
          makeNode("TEXT", [0.18, 0.86, 0.62, 0.06] as const, {
            id: "help-text",
            text: makeText("paragraph", { hash: "help_paragraph", len: 320 }),
            style: { tokens: ["muted"], size: "sm" },
          }),
        ],
      }),

      // -----------------------------------------------------------------------
      // TOAST NOTIFICATION
      // -----------------------------------------------------------------------
      makeNode("TOAST", [0.72, 0.02, 0.26, 0.05] as const, {
        id: "toast-success",
        z: 9,
        text: makeText("sentence", { hash: "toast_order_saved", len: 38 }),
        style: { tokens: ["success", "elevated"] },
        state: [{ key: "ui.toast.visible", access: "condition", scope: "local" }],
      }),

      // -----------------------------------------------------------------------
      // MODAL (login prompt overlay)
      // -----------------------------------------------------------------------
      makeNode("MODAL", [0.2, 0.15, 0.6, 0.7] as const, {
        id: "auth-modal",
        z: 10,
        pattern: { kind: "auth_form", variant: "login" },
        style: { tokens: ["elevated"] },
        state: [{ key: "ui.authModal.open", access: "condition", scope: "local" }],
        children: [
          makeNode("TEXT", [0.25, 0.18, 0.5, 0.05] as const, {
            id: "modal-title",
            text: makeText("short", { hash: "modal_login_title", len: 14 }),
            style: { tokens: ["primary"], size: "lg" },
          }),
          makeNode("FORM", [0.25, 0.25, 0.5, 0.45] as const, {
            id: "login-form",
            semantic: "login",
            handlers: [{ event: "submit", intent: "authenticate" }],
            children: [
              makeNode("INPUT", [0.28, 0.28, 0.44, 0.06] as const, {
                id: "login-email",
                interactive: true,
                enabled: true,
                focusable: true,
                semantic: "email",
                text: makeText("short", { hash: "placeholder_email", len: 13 }),
                bindings: [{ property: "value", expression: "auth.email" }],
                state: [{ key: "auth.email", access: "readwrite", scope: "local" }],
              }),
              makeNode("INPUT", [0.28, 0.36, 0.44, 0.06] as const, {
                id: "login-password",
                interactive: true,
                enabled: true,
                focusable: true,
                semantic: "password",
                text: makeText("short", { hash: "placeholder_pw", len: 8 }),
                bindings: [{ property: "value", expression: "auth.password" }],
                state: [{ key: "auth.password", access: "write", scope: "local" }],
              }),
              makeNode("CHECKBOX", [0.28, 0.44, 0.44, 0.04] as const, {
                id: "remember-me",
                interactive: true,
                enabled: true,
                text: makeText("short", { hash: "remember_label", len: 11 }),
                bindings: [{ property: "checked", expression: "auth.remember" }],
                state: [{ key: "auth.remember", access: "readwrite", scope: "local" }],
              }),
              makeNode("BUTTON", [0.35, 0.5, 0.3, 0.07] as const, {
                id: "login-submit",
                interactive: true,
                enabled: true,
                semantic: "submit",
                text: makeText("short", { hash: "btn_sign_in", len: 7 }),
                style: { tokens: ["primary", "elevated"], size: "lg" },
                handlers: [{ event: "click", intent: "submit_form" }],
                state: [{ key: "auth.loading", access: "read", scope: "local" }],
                bindings: [{ property: "disabled", expression: "auth.loading" }],
              }),
              makeNode("LINK", [0.38, 0.59, 0.24, 0.03] as const, {
                id: "forgot-password",
                interactive: true,
                text: makeText("short", { hash: "forgot_pw_link", len: 16 }),
                style: { tokens: ["muted"], size: "sm" },
                handlers: [{ event: "click", intent: "navigate" }],
              }),
            ],
          }),
          // Close button
          makeNode("ICON", [0.73, 0.17, 0.04, 0.04] as const, {
            id: "modal-close",
            interactive: true,
            semantic: "close",
            handlers: [{ event: "click", intent: "close_modal" }],
          }),
        ],
      }),

      // -----------------------------------------------------------------------
      // FOOTER
      // -----------------------------------------------------------------------
      makeNode("FOOTER", [0, 0.94, 1, 0.06] as const, {
        id: "footer",
        style: { tokens: ["muted"], density: "compact" },
        children: [
          makeNode("TEXT", [0.3, 0.95, 0.4, 0.02] as const, {
            id: "copyright",
            text: makeText("short", { hash: "copyright_2024", len: 22 }),
          }),
          makeNode("LINK", [0.35, 0.975, 0.06, 0.02] as const, {
            id: "footer-privacy",
            interactive: true,
            text: makeText("short", { hash: "privacy_link", len: 7 }),
          }),
          makeNode("LINK", [0.42, 0.975, 0.06, 0.02] as const, {
            id: "footer-terms",
            interactive: true,
            text: makeText("short", { hash: "terms_link", len: 5 }),
          }),
          makeNode("LINK", [0.49, 0.975, 0.06, 0.02] as const, {
            id: "footer-contact",
            interactive: true,
            text: makeText("short", { hash: "contact_link", len: 7 }),
          }),
        ],
      }),
    ],
  }),
  {
    url: "https://shop.example.com/dashboard",
    viewport: { w_px: 1920, h_px: 1080, aspect: 1920 / 1080 },
    timestamp_ms: 1700000000000,
  }
);
