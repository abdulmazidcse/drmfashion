import { redirect } from "next/navigation"

// Split into Admin → Customers and Admin → Staff; old bookmarks land here.
export default function UsersPage() {
  redirect("/admin/customers")
}
