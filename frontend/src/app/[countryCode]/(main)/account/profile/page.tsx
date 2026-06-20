// User-specific page - opt out of static prerender.
export const dynamic = "force-dynamic"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import ProfilePicture from "@modules/account/components/profile-picture"
import ProfileGender from "@modules/account/components/profile-gender"
import AccountPageHeader from "@modules/account/components/page-header"

import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your profile.",
  robots: { index: false, follow: false },
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer) {
    redirect("/account")
  }

  if (!regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <AccountPageHeader
        icon="ph-user"
        title="Profile"
        subtitle="Update your name, email, phone, gender, password, and profile picture."
      />
      <div className="flex flex-col gap-y-8 w-full">
        <ProfilePicture customer={customer} />
        <Divider />
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        <ProfileGender customer={customer} />
        <Divider />
        <ProfilePassword customer={customer} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
