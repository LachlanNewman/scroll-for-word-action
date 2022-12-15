import got from 'got'
import core from '@actions/core';
import fs from 'fs';
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const API_URL = "https://scroll-office.addons.k15t.com/api/public/1/exports"

export async function getPageId(title,confluenceurl,password,spaceKey,username){
    const response =  await got.get(confluenceurl,{
        searchParams:{
            spaceKey,
            title,
            limit: 1,
            start: 0,
            expand: null
        },
        username,
        password,
    }).json()
    return response['results'][0].id
}


async function startExport(exportParameters,authHeader){
    Buffer.from
    const body = Buffer.from(JSON.stringify(exportParameters))
    const headers= {"Content-Type": "application/json", "Authorization": authHeader}
    const response = await got.post(API_URL,{
        headers,
        body
    }).text().json()
    return response['jobId']
}

async function getStatus(jobId,authHeader){
    const url = `${API_URL}/${jobId}/status` 
    const headers = {"Authorization": authHeader}
    return got.get(url,{
        headers,
    }).json()
}

async function download_file(url,title){
    const dir = './scroll-word-docs'
    const response  = await got.get(url,{
        headers:{},
    }).buffer()
    if (!fs.existsSync(dir)){
        await fs.mkdirSync(dir);
    }
    await fs.writeFileSync(`./scroll-word-docs/${title}.docx`,response,{flag: "w"})
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
  
    arrayOfFiles = arrayOfFiles || []
  
    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
      } else {
        const {name} = path.parse(path.join(__dirname, dirPath, "/", file))
        arrayOfFiles.push(name)
      }
    })
  
    return arrayOfFiles
  }

async function processPage(pageId,pageTitle){
    const authToken = core.getInput('scroll-for-word-api-key')
    const templateId = core.getInput('template-id')
    const authHeader = `Bearer ${authToken}`
    const exportParameters = {
        pageId,
        templateId,
        scope:"descendants",
    }

    const exportJobId = await startExport(exportParameters,authHeader)
    console.log(`Export started (job ID = ${exportJobId})`)

    let done = false
    let downloadUrl = null
    while(!done){
        const status = await getStatus(exportJobId,authHeader)
        done = status["status"] != "incomplete"
        if(done) downloadUrl = status["downloadUrl"]
    }
    await download_file(downloadUrl,pageTitle)
}


function checkConfluenceInputs(confluenceToken, confluenceSpaceKey , confluenceUrl , confluenceUsername){
    if(!confluenceToken || !confluenceSpaceKey || !confluenceUrl || !confluenceUsername){
        throw new Error(`
        page-title,
        conflunce-url
        confluence-api-key,
        confluence-space-key 
        required when pageId is not given or dir is given`)
    }
}


async function main(){
    const dir = core.getInput('dir')
    const pageTitle = core.getInput('page-title')
    const confluenceToken = core.getInput('confluence-api-key')
    const confluenceSpaceKey =  core.getInput('confluence-space-key')
    const confluenceUrl = core.getInput('confluence-url')
    const confluenceUsername = core.getInput('confluence-username')

    if(dir){
        checkConfluenceInputs(confluenceUrl,confluenceToken,confluenceSpaceKey,confluenceUsername)
        const files = getAllFiles(dir)
        files.forEach(async file => {
            const pageId = await getPageId(file,confluenceUrl,confluenceToken,confluenceSpaceKey,confluenceUsername)
            await processPage(pageId,file)
        })
        return
    }
    
    let pageId = core.getInput('page-id');
    if(!pageId && pageTitle){
        checkConfluenceInputs(confluenceUrl,confluenceToken,confluenceSpaceKey,confluenceUsername)
        pageId = await getPageId(pageTitle,confluenceUrl,confluenceToken,confluenceSpaceKey,confluenceUsername)
        await processPage(pageId,pageTitle)
        return
    }

    await processPage(pageId,pageTitle)
}
main()

