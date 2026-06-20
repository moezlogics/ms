import { Module } from "@medusajs/framework/utils"
import OtpAuthModuleService from "./service"

export const OTP_AUTH_MODULE = "otp_auth"

export default Module(OTP_AUTH_MODULE, {
  service: OtpAuthModuleService,
})
