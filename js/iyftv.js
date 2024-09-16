const fs = require('fs')
const os = require('os')
const cheerio = require('cheerio')
const axios = require('axios')
const CryptoJS = require('crypto-js')

const cachesPath = `${os.homedir()}/Documents/caches`
const jsonPath = `${cachesPath}/iyf-keys.json`
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3'

let appConfig = {
    ver: 1,
    title: '愛壹帆',
    site: 'https://m10.iyf.tv',
    tabs: [
        {
            name: '电影',
            ext: {
                id: '3',
            },
        },
        {
            name: '电视',
            ext: {
                id: '4',
            },
        },
        {
            name: '综艺',
            ext: {
                id: '5',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '6',
            },
        },
        {
            name: '短剧',
            ext: {
                id: '4,155',
            },
        },
        {
            name: '体育',
            ext: {
                id: '95',
            },
        },
        {
            name: '纪录片',
            ext: {
                id: '7',
            },
        },
    ],
}

async function getConfig() {
    await updateKeys()
    return appConfig
}

async function getCards(ext) {
    const publicKey = JSON.parse(fs.readFileSync(jsonPath)).publicKey
    let cards = []
    let { id, page = 1 } = ext

    let url = `${appConfig.site}/api/list/Search?cinema=1&page=${page}&size=36&orderby=0&desc=1&cid=0,1,${id}&isserial=-1&isIndex=-1&isfree=-1`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    let list = data.data.info[0].result

    list.forEach((e) => {
        cards.push({
            vod_id: e.key,
            vod_name: e.title,
            vod_pic: e.image,
            vod_remarks: e.cid,
            ext: {
                key: e.key,
            },
        })
    })

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    const publicKey = JSON.parse(fs.readFileSync(jsonPath)).publicKey
    let tracks = []
    let key = ext.key

    let url = `${appConfig.site}/v3/video/languagesplaylist?cinema=1&vid=${key}&lsk=1&taxis=0&cid=0,1,4,133`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let playlist = data.data.info[0].playList
    playlist.forEach((e) => {
        const name = e.name
        const key = e.key
        tracks.push({
            name: name,
            pan: '',
            ext: {
                key: key,
            },
        })
    })

    return {
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    }
}

async function getPlayinfo(ext) {
    const publicKey = JSON.parse(fs.readFileSync(jsonPath)).publicKey
    let key = ext.key
    let url = `${appConfig.site}/v3/video/play?cinema=1&id=${key}&a=0&lang=none&usersign=1&region=GL.&device=1&isMasterSupport=1`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let paths = data.data.info[0].flvPathList
    let playUrl = ''
    paths.forEach(async (e) => {
        if (e.isHls) {
            let link = e.result
            link += `?vv=${getSignature('')}&pub=${publicKey}`
            playUrl = link
        }
    })

    return { urls: [playUrl] }
}

async function search(ext) {
    let cards = []

    const text = ext.text
    const page = ext.page || 1
    const url = `https://rankv21.iyf.tv/v3/list/briefsearch?tags=${encodeURIComponent(text)}&orderby=4&page=${page}&size=10&desc=0&isserial=-1&istitle=true`

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let list = data.data.info[0].result
    list.forEach((e) => {
        cards.push({
            vod_id: e.contxt,
            vod_name: e.title,
            vod_pic: e.imgPath,
            vod_remarks: e.cid,
            ext: {
                key: e.contxt,
            },
        })
    })

    return {
        list: cards,
    }
}

async function updateKeys() {
    let baseUrl = 'https://www.iyf.tv'
    let { data } = await axios.get(baseUrl, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    let script = $('script:contains(injectJson)').text()
    script.split('\n').forEach((e) => {
        if (e.includes('injectJson')) {
            let json = JSON.parse(e.replace('var injectJson =', '').replace(';', ''))
            let publicKey = json['config'][0]['pConfig']['publicKey']
            let privateKey = json['config'][0]['pConfig']['privateKey']
            let keys = {
                publicKey: publicKey,
                privateKey: privateKey,
            }
            const jsonData = JSON.stringify(keys, null, 2)

            fs.writeFileSync(jsonPath, jsonData)
        }
    })
}

function getSignature(query) {
    const publicKey = JSON.parse(fs.readFileSync(jsonPath)).publicKey
    const privateKey = getPrivateKey()
    const input = publicKey + '&' + query.toLowerCase() + '&' + privateKey

    return CryptoJS.MD5(CryptoJS.enc.Utf8.parse(input)).toString()
}

function getPrivateKey() {
    const privateKey = JSON.parse(fs.readFileSync(jsonPath)).privateKey
    const timePublicKeyIndex = Date.now()

    return privateKey[timePublicKeyIndex % privateKey.length]
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
