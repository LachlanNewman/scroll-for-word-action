import got from 'got'
import core from '@actions/core';

const API_URL = "https://scroll-office.addons.k15t.com/api/public/1/exports"

export async function getPages(url,space,password,username){
    const response =  await got.get(`${url}/space/${space}/content`,{
        searchParams:{
            limit: 9999,
            start: 0,
            expand: null
        },
        username,
        password,
    }).json()
    return response.page.results.map(({id,title}) => ({id,title}))
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
    await mkdirSync('./scroll-word-docs')
    await writeFileSync(`./scroll-word-docs/${title}.docx`,response,{flag: "w"})
}

async function processPage(pageId,pageTitle,authToken,templateId){
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

async function main(){
    const confluenceToken = core.getInput('confluence-api-key')
    const confluenceSpaceKey =  core.getInput('confluence-space-key')
    const confluenceUrl = core.getInput('confluence-url')
    const confluenceUsername = core.getInput('confluence-username')
    const authToken = core.getInput('scroll-for-word-api-key')
    const templateId = core.getInput('template-id')

    const pages = getPages(confluenceUrl,confluenceSpaceKey,confluenceToken,confluenceUsername)
    await Promise.all(pages.map(({id,title}) => processPage(id,title,authToken,templateId)))
}

main()