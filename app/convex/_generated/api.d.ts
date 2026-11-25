/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as bankInvoices from "../bankInvoices.js";
import type * as banks from "../banks.js";
import type * as customers from "../customers.js";
import type * as expenseHeads from "../expenseHeads.js";
import type * as invoices from "../invoices.js";
import type * as lib from "../lib.js";
import type * as loanFiles from "../loanFiles.js";
import type * as receipts from "../receipts.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as vouchers from "../vouchers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  auth: typeof auth;
  bankInvoices: typeof bankInvoices;
  banks: typeof banks;
  customers: typeof customers;
  expenseHeads: typeof expenseHeads;
  invoices: typeof invoices;
  lib: typeof lib;
  loanFiles: typeof loanFiles;
  receipts: typeof receipts;
  reports: typeof reports;
  seed: typeof seed;
  settings: typeof settings;
  vouchers: typeof vouchers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
