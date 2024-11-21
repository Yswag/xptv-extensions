const CryptoJS = createCryptoJS()

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
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '公告留言']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    let url = appConfig.site + '/v2/type/top_type'
    let res = await postData(url)

    let types = argsify(res.data).data.list
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
    ext = argsify(ext)
    let cards = []
    const limit = 12
    const param = {
        type_id: ext.id,
        page: ext.page || 1,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/type_search'

    let res = await postData(url, param)

    let list = argsify(res.data).data.list
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

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let groups = []
    const param = {
        vod_id: ext.id,
    }
    const url = appConfig.site + '/v2/home/vod_details'

    let res = await postData(url, param)
    let playlist = argsify(res.data).data.vod_play_list
    playlist.forEach((e) => {
        const videoInfo = e.urls
        const parse = e.parse_urls[0] || ''
        let from = e.flag
        let group = {
            title: from,
            tracks: [],
        }
        videoInfo.forEach((e) => {
            let ep = e.name
            let url = e.url
            if (parse) {
                url = parse + url
            }

            group.tracks.push({
                name: `${ep}`,
                pan: '',
                ext: {
                    url: url,
                },
            })
        })

        groups.push(group)
    })

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    let isParse = url.includes('url=')

    if (isParse) {
        let res = await request(url)
        let json = argsify(res.data)
        if (json.url) {
            return jsonify({ urls: [json.url] })
        }
        return jsonify({ urls: [url.split('url=')[1]] })
    }

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const limit = 12
    const param = {
        keyword: text,
        page: page,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/search'

    let res = await postData(url, param)

    let list = argsify(res.data).data.list
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

    return jsonify({
        list: cards,
    })
}

async function postData(url, data) {
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const key = 'kj5649ertj84ks89r4jh8s45hf84hjfds04k'
    const sign = CryptoJS.MD5(key + timestamp).toString()
    let defaultData = {
        sign: sign,
        timestamp: timestamp.toString(),
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

    if (method === 'post') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        return $fetch.post(reqUrl, data, {
            headers: headers,
        })
    }

    return $fetch.get(reqUrl, {
        headers: headers,
    })
}
