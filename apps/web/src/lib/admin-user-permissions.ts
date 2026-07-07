export function canDeleteAdminUser(targetUserId: string, currentUserId: string) {
  return targetUserId.length > 0 && targetUserId !== currentUserId
}
