import { describe, expect, it } from 'vitest'
import { createCalculationEngine } from './calculationEngine'

describe('createCalculationEngine', () => {
  it('exécute les dépendances avant les calculateurs dépendants', async () => {
    const executionOrder: string[] = []

    const engine = createCalculationEngine({
      debounceMs: 0,
      database: {
        calculationState: {
          put: async () => undefined,
        },
      } as any,
      registry: [
        {
          id: 'base',
          dependsOn: [],
          run: async () => {
            executionOrder.push('base')
          },
        },
        {
          id: 'derived',
          dependsOn: ['base'],
          run: async () => {
            executionOrder.push('derived')
          },
        },
      ],
      logger: {
        log: () => undefined,
      },
    })

    await engine.run(['derived'])

    expect(executionOrder).toEqual(['base', 'derived'])
  })
})
