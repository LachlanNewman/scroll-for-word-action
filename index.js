import got from 'got'
import core from '@actions/core';
import { writeFileSync } from 'fs';

const API_URL = "https://scroll-office.addons.k15t.com/api/public/1/exports"

async function getPageId(title,confluenceurl,password,spaceKey,username){
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
    const response  = await got.get(url,{
        headers:{},
    }).buffer()
    await writeFileSync(`./${title}.docx`,response,{flag: "w"})
}

async function main(){
    let pageId = core.getInput('page-id');
    const authToken = core.getInput('scroll-for-word-api-key')
    const templateId = core.getInput('template-id')

    const pageTitle = core.getInput('page-title')
    const confluenceToken = core.getInput('confluence-api-key')
    const confluenceSpaceKey =  core.getInput('confluence-space-key')
    const confluenceUrl = core.getInput('confluence-url')
    const confluenceUsername = core.getInput('confluence-username')

    const confluenceInputs =  confluenceToken && confluenceSpaceKey && confluenceUrl && confluenceUsername

    if(!pageId){
        if(!confluenceInputs){
            throw new Error(`
            page-title,
            conflunce-url
            confluence-api-key,
            confluence-space-key 
            required when pageId is not given`)
        }
        pageId = await getPageId(pageTitle,confluenceUrl,confluenceToken,confluenceSpaceKey,confluenceUsername)
    }
    
    
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

main()