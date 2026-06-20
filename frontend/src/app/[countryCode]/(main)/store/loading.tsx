import { ListingSkeleton } from "@modules/skeletons/templates/page-skeletons"

// Server component → instant paint on click (no client JS). Gives the
// "page opened, content loading" feel instead of a frozen old page.
export default function Loading() {
  return <ListingSkeleton />
}
