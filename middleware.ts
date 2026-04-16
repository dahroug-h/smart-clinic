import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Allow public access to auth pages, webhooks, and the landing page.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/webhook(.*)',
  '/'
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
