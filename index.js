import crowdin from '@crowdin/crowdin-api-client'
import { XMLParser } from 'fast-xml-parser'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto'

const project = process.env.CROWDIN_PROJECT

const { translationsApi, projectsGroupsApi } = new crowdin.default({
  token: process.env.CROWDIN_TOKEN
})

const parser = new XMLParser({
  ignoreAttributes: false
})

await fsp.mkdir('dist/languages', {
  recursive: true
})

const { data: { targetLanguageIds: languages } } = await projectsGroupsApi.getProject(project)

const available = await Promise.all(languages.map(async (language) => {
  const { data: { url } } = await translationsApi.exportProjectTranslation(project, {
    targetLanguageId: language,
    format: 'xliff'
  })

  const response = await fetch(url)
  const xml = await response.text()

  const { xliff: { file: { body } } } = parser.parse(xml)

  const translations = {}

  for (const unit of body['trans-unit']) {
    const key = unit['@_resname'].split('.')[1]
    const translation = unit.target['#text']

    translations[key] = translation
  }

  const json = JSON.stringify(translations, null, '\t')
  const hash = crypto.createHash('md5').update(json).digest("hex")

  await fsp.writeFile(`dist/languages/${language}.json`, json)

  return { [language]: hash }
}))

await fsp.writeFile(`dist/available.json`, JSON.stringify(available))