import crowdin from '@crowdin/crowdin-api-client'
import { XMLParser } from 'fast-xml-parser'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto';

import 'dotenv/config'
import fetch from "node-fetch";

const project_id = 515350
const languages = ['nl', 'fr']

let checksums = {};

const { translationsApi } = new crowdin.default({
  token: process.env.CROWDIN_TOKEN
})

const parser = new XMLParser({
  ignoreAttributes: false
})

createFolders();
getFiles();

function createFolders() {
    if(!fs.existsSync("./lib/languages")) {
        fs.mkdirSync('./lib', { recursive: true });
        fs.mkdirSync('./lib/languages', { recursive: true });
    }
}

async function getFiles(){
    await Promise.all(languages.map(async (language) => {
        const { data: { url } } = await translationsApi.exportProjectTranslation(project_id, {
            targetLanguageId: language,
            format: 'xliff'
        })
    
        const response = await fetch(url)
        const xml = await response.text()
    
        const { xliff: { file: { body } } } = parser.parse(xml)
    
        const translations = {}
    
        for (const unit of body['trans-unit']) {
            translations[unit['@_resname']] = unit.target['#text']
        }
    
        checksums[language] = crypto.createHash('md5').update(JSON.stringify(translations, null, '\t')).digest("hex");
    
        fsp.writeFile(`lib/languages/${language}.json`, JSON.stringify(translations, null, '\t'))
    }));
    fsp.writeFile(`lib/languages/translations.json`, JSON.stringify(checksums, null, '\t'))
}