const fs = require('fs')
const os = require('os')
const cheerio = require('cheerio')
const axios = require('axios')
const CryptoJS = require('crypto-js')

// 測試時忽略證書驗證
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const cachesPath = `${os.homedir()}/Documents/caches`

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3'
let cookie = 'PHPSESSID=eebef1362fc5312a330b700fc4fafbd0'

let appConfig = {
    ver: 1,
    title: '天天影視',
    site: 'http://op.ysdqjs.cn',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return config
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '公告留言']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    let url = appConfig.site + '/v2/type/top_type'
    let res = await postData(url)

    let types = (await res.json()).data.list
    types.forEach((e) => {
        const name = e.type_name
        const id = e.type_id
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                id: id.toString(),
            },
        })
    })

    return list
}

async function getCards(ext) {
    let cards = []
    const limit = 12
    const param = {
        type_id: ext.id,
        page: ext.page || 1,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/type_search'

    let res = await postData(url, param)

    let list = (await res.json()).data.list
    list.forEach((e) => {
        const id = e.vod_id.toString()
        cards.push({
            vod_id: id,
            vod_name: e.vod_name,
            vod_pic: e.vod_pic,
            vod_remarks: e.vod_remarks,
            ext: {
                id: id,
            },
        })
    })

    return {
        list: cards,
    }
}

async function getTracks(ext) {
    let tracks = []
    const param = {
        vod_id: ext.id,
    }
    const url = appConfig.site + '/v2/home/vod_details'

    let res = await postData(url, param)
    let playlist = (await res.json()).data.vod_play_list
    playlist.forEach((e) => {
        const sourceName = obj.name
        let playList = ''
        const videoInfo = obj.urls
        const parse = obj.parse_urls
        if (parse && parse.length > 0) this.parseMap[sourceName] = parse

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

async function postData(url, data) {
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const key = 'kj5649ertj84ks89r4jh8s45hf84hjfds04k'
    const sign = CryptoJS.MD5(key + timestamp).toString()
    let defaultData = {
        sign: sign,
        timestamp: timestamp,
    }
    const reqData = data ? Object.assign({}, defaultData, data) : defaultData

    return await request(url, 'post', reqData)
}

async function request(reqUrl, method, data) {
    const headers = {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
    }

    if (cookie) {
        headers['Cookie'] = cookie
    }

    const body = method === 'post' ? new URLSearchParams(data).toString() : null

    let res = await fetch(reqUrl, {
        method: method || 'get',
        headers: headers,
        body: body, // Only for POST requests
    })

    // Check for status instead of code
    if (res.status === 403) {
        const text = await res.text()
        const path = text.match(/window\.location\.href ="(.*?)"/)[1]
        cookie = Array.isArray(res.headers.get('set-cookie')) ? res.headers.get('set-cookie').join(';') : res.headers.get('set-cookie')

        headers['Cookie'] = cookie

        res = await fetch(appConfig.site + path, {
            method: method || 'get',
            headers: headers,
            body: body, // Only for POST requests
        })
    }

    return res
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
