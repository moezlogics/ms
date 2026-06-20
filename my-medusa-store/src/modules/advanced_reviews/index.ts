import { Module } from "@medusajs/framework/utils"
import AdvancedReviewsModuleService from "./service"

export const ADVANCED_REVIEWS_MODULE = "advanced_reviews"

export default Module(ADVANCED_REVIEWS_MODULE, {
  service: AdvancedReviewsModuleService,
})
