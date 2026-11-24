type SearchableUser = {
  name: string
  email: string
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

export function filterAdminUsers<T extends SearchableUser>(
  users: T[],
  query: string,
) {
  const search = normalize(query)

  if (!search) {
    return users
  }

  return users.filter(
    (user) =>
      normalize(user.name).includes(search) ||
      normalize(user.email).includes(search),
  )
}

const TIME_ZONE = 'Europe/Paris'

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

function getDayKey(date: Date) {
  return dayKeyFormatter.format(date)
}

// "Aujourd’hui · 08:42", "Hier · 16:18", "12 nov. 2026 · 10:05" or "Jamais".
export function formatLastLogin(
  value: string | null | undefined,
  now: Date = new Date(),
) {
  if (!value) {
    return 'Jamais'
  }

  const date = new Date(value)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dayKey = getDayKey(date)
  const time = timeFormatter.format(date)

  if (dayKey === getDayKey(now)) {
    return `Aujourd’hui · ${time}`
  }

  if (dayKey === getDayKey(yesterday)) {
    return `Hier · ${time}`
  }

  return `${shortDateFormatter.format(date)} · ${time}`
}
