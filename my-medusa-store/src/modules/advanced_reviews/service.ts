import { MedusaService } from "@medusajs/framework/utils"
// Aliased so MedusaService auto-generates `listAndCountAdvancedReviews`,
// `createAdvancedReviews`, `updateAdvancedReviews`, etc. — the names every
// route in /api/(store|admin)/(reviews|advanced-reviews) already calls.
// Without this alias the methods would be `listAndCountReviews`, breaking
// product detail pages with a TypeError on every PDP load.
import { Review as AdvancedReview } from "./models/review"

export default class AdvancedReviewsModuleService extends MedusaService({
  AdvancedReview,
}) {}
