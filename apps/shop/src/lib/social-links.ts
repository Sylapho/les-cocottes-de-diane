export function getSocialLinks() {
  return {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || undefined,
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || undefined,
  } as const
}

export function getConfiguredSocialUrls() {
  return Object.values(getSocialLinks()).filter(
    (url): url is string => url !== undefined,
  )
}
