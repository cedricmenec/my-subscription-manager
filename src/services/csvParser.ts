export interface CsvParseResult {
  headers: string[]
  rows: string[][]
}

export interface CsvRow {
  [column: string]: string
}

/**
 * Parse un texte CSV en lignes et colonnes.
 * Gère les guillemets doubles pour les valeurs contenant des virgules.
 * N'utilise aucune dépendance externe.
 */
export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)

  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCsvLine(lines[0])
  const rows: string[][] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    if (values.length > 0 && values.some(v => v.trim().length > 0)) {
      rows.push(values)
    }
  }

  return { headers, rows }
}

/**
 * Convertit les lignes parsées en tableau d'objets indexés par en-tête.
 */
export function csvRowsToObjects(
  result: CsvParseResult,
): CsvRow[] {
  return result.rows.map(row => {
    const obj: CsvRow = {}
    result.headers.forEach((header, index) => {
      obj[header.trim()] = row[index]?.trim() ?? ''
    })
    return obj
  })
}

/**
 * Génère un texte CSV à partir d'en-têtes et de lignes de valeurs.
 */
export function generateCsv(headers: string[], rows: string[][]): string {
  const escapeValue = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const headerLine = headers.map(escapeValue).join(',')
  const dataLines = rows.map(row =>
    row.map(value => escapeValue(value ?? '')).join(','),
  )

  return [headerLine, ...dataLines].join('\n')
}

/**
 * Parse une ligne CSV en tenant compte des guillemets.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        current += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        values.push(current)
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
  }

  values.push(current)
  return values
}