import appleProxyApp from './apple-proxy'

/**
 * Registry of every product this super app manages.
 *
 * Each entry contributes its own nav group, routes and API client, so adding
 * the next managed app means dropping a folder in `src/apps/` and appending it
 * here. Nav and routing are derived from this list; nothing else needs editing.
 */
const registeredApps = [appleProxyApp]

export const getApps = () => registeredApps

export const getAppById = (id) => registeredApps.find((app) => app.id === id)

/** Apps the given role-checker is allowed to see. */
export const getVisibleApps = (hasRole) =>
  registeredApps.filter(
    (app) => !app.requiredRoles?.length || app.requiredRoles.some((role) => hasRole(role)),
  )

export const getAppRoutes = () => registeredApps.flatMap((app) => app.routes || [])

export default registeredApps
