const CryptoJS = require('crypto-js')
const fetch = require('node-fetch')

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
        const videoInfo = e.urls
        const parse = e.parse_urls[0] || ''
        videoInfo.forEach((e) => {
            let from = e.form
            let ep = e.name
            let url = e.url
            if (parse) {
                url = parse + url
            }

            tracks.push({
                name: `${from}-${ep}`,
                pan: '',
                ext: {
                    url: url,
                },
            })
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
    let url = ext.url
    let isParse = url.includes('url=')

    if (isParse) {
        let res = await request(url)
        let json = await res.json()
        if (json.url) {
            return { urls: [json.url] }
        }
        return { urls: [url.split('url=')[1]] }
    }

    return { urls: [url] }
}

async function search(ext) {
    let cards = []

    const text = ext.text
    const page = ext.page || 1
    const limit = 12
    const param = {
        keyword: text,
        page: page,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/search'

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

async function postData(url, data) {
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const key = 'kj5649ertj84ks89r4jh8s45hf84hjfds04k'
    const sign = CryptoJS.MD5(key + timestamp).toString()
    let defaultData = {
        sign: sign,
        timestamp: timestamp,
    }
    const reqData = data ? Object.assign({}, defaultData, data) : defaultData

    return request(url, 'post', reqData)
}

async function request(reqUrl, method, data) {
    const headers = {
        'User-Agent': UA,
    }

    if (cookie) {
        headers['Cookie'] = cookie
    }
    let body = null

    if (method === 'post') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        body = new URLSearchParams(data).toString()
    }

    return fetch(reqUrl, {
        method: method || 'get',
        headers: headers,
        body: body,
    })

    // if (res.status === 403) {
    //     const text = await res.text()
    //     const path = text.match(/window\.location\.href ="(.*?)"/)[1]
    //     cookie = Array.isArray(res.headers.get('set-cookie')) ? res.headers.get('set-cookie').join(';') : res.headers.get('set-cookie')

    //     headers['Cookie'] = cookie

    //     res = await fetch(appConfig.site + path, {
    //         method: method || 'get',
    //         headers: headers,
    //         body: body,
    //     })
    // }

    // return res
}

module.exports = { getConfig, getCards, getTracks, getPlayinfo, search }
