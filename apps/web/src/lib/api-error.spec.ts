import assert from 'node:assert/strict'
import test from 'node:test'
import { getApiErrorMessage, getUnknownErrorMessage } from './api-error'

test('formats structured stock issues without exposing negative availability', async () => {
  const response = Response.json(
    {
      insufficientStock: [
        { nom: 'Terrine', requested: 3, sellableStock: -1 },
      ],
    },
    { status: 409 },
  )

  assert.equal(
    await getApiErrorMessage(response),
    'Stock insuffisant pour une ou plusieurs lignes. Terrine : 3 demandé(s), 0 disponible(s).',
  )
})

test('formats nested ingredient issues with their unit', async () => {
  const response = Response.json(
    {
      message: {
        insufficientIngredients: [
          { nom: 'Farine', missing: 250, unite: 'g' },
        ],
      },
    },
    { status: 409 },
  )

  assert.equal(
    await getApiErrorMessage(response),
    'Stock insuffisant pour produire cet article. Farine : 250 g manquant(s).',
  )
})

test('normalizes validation, database and authorization errors', async () => {
  assert.equal(
    await getApiErrorMessage(
      Response.json({ message: 'email must be an email' }, { status: 400 }),
    ),
    'L’adresse email n’est pas valide.',
  )
  assert.equal(
    await getApiErrorMessage(
      new Response('Foreign key constraint failed', { status: 409 }),
    ),
    'Impossible de supprimer cet élément car il est utilisé ailleurs.',
  )
  assert.equal(
    await getApiErrorMessage(new Response(null, { status: 403 })),
    'Vous n’avez pas les droits nécessaires pour cette action.',
  )
})

test('uses readable text and safe fallbacks for malformed responses', async () => {
  assert.equal(
    await getApiErrorMessage(new Response('Service indisponible', { status: 503 })),
    'Service indisponible',
  )
  assert.equal(
    await getApiErrorMessage(
      new Response('{invalid json', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    ),
    'Le serveur ne répond pas correctement. Réessayez dans quelques instants.',
  )
  assert.equal(getUnknownErrorMessage(new Error('Network unavailable')), 'Network unavailable')
  assert.equal(getUnknownErrorMessage(null, 'Fallback'), 'Fallback')
})
