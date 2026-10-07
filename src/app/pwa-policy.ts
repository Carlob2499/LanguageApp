/** When a waiting update may be offered. Pure, so the rule is unit-tested. */
export function updateOfferAllowed(pathname: string, needRefresh: boolean): boolean {
  if (!needRefresh) return false
  // Never in the middle of a review or a placement test; they lose state on reload.
  return pathname !== '/review' && pathname !== '/placement'
}
