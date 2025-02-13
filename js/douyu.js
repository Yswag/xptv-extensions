const UA = 'Dart/3.4'
const config = argsify($config_str)

let appConfig = {
    ver: 1,
    title: 'douyu',
    site: 'https://www.douyu.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(appConfig)
}

async function getTabs() {
    let tabs = []
    let url = 'https://m.douyu.com/api/cate/list'

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    argsify(data).data.cate2Info.forEach((e) => {
        tabs.push({
            id: e.cate2Id,
            name: e.cate2Name,
            ext: {
                cate2Id: e.cate2Id,
            },
            ui: 1,
        })
    })

    return tabs
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { cate2Id, page = 1 } = ext

    const url = appConfig.site + `/gapi/rkc/directory/mixList/2_${cate2Id}/${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    argsify(data).data.rl.forEach((e) => {
        if (e.type != 1) return
        cards.push({
            vod_id: e.rid.toString(),
            vod_name: e.rn,
            vod_pic: e.rs16.toString(),
            vod_duration: e.nn,
            ext: {
                id: e.rid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    let id = ext.id
    let sign = await getSign(id)
    let body = sign + '&cdn=&rate=-1&ver=Douyu_223061205&iar=1&ive=1&hevc=0&fa=0'
    let url = `${appConfig.site}/lapi/live/getH5Play/${id}`

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
        },
    })

    let multirates = argsify(data).data.multirates
    let cdns = argsify(data).data.cdnsWithName
    cdns.forEach((e) => {
        let tracks = multirates.map((rate) => ({
            name: rate.name,
            pan: '',
            ext: {
                rate: rate.rate,
                cdn: e.cdn,
                id,
                sign,
            },
        }))

        lists.push({
            title: `${e.name} (${e.cdn})`,
            tracks: tracks,
        })
    })

    return jsonify({
        list: lists,
    })
}

async function getSign(id) {
    let roomDetailsUrl = `${appConfig.site}/swf_api/homeH5Enc?rids=${id}`
    let detailRes = await $fetch.get(roomDetailsUrl, {
        headers: {
            Referer: `https://www.douyu.com/${id}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43',
        },
    })
    let html = argsify(detailRes.data).data[`room${id}`]
    html = html.match(/(vdwdae325w_64we[\s\S]*function ub98484234[\s\S]*?)function/)?.[1] || ''
    html = html.replace(/eval.*?;}/g, 'strc;}')

    let signRes = await $fetch.post(
        'http://alive.nsapps.cn/api/AllLive/DouyuSign',
        {
            html: html,
            rid: id,
        },
        {
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/json',
            },
        }
    )

    let sign = argsify(signRes.data).data

    return sign
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let { id, cdn, rate, sign } = ext
    const url = `${appConfig.site}/lapi/live/getH5Play/${id}`

    const { data } = await $fetch.post(url, `${sign}&cdn=${cdn}&rate=${rate}`, {
        headers: {
            Referer: `https://www.douyu.com/${id}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43',
        },
    })

    const playUrl = argsify(data).data.rtmp_url + '/' + argsify(data).data.rtmp_live

    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': 'libmpv' }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/japi/search/api/searchShow`
    const did = generateRandomString(32)

    const { data } = await $fetch.get(url + `?kw=${text}&page=${page}&pageSize=20`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51',
            Referer: 'https://www.douyu.com/search/',
            Cookie: `dy_did=${did};acf_did=${did}`,
        },
    })

    argsify(data).data.relateShow.forEach((e) => {
        if (e.type != 1) return
        cards.push({
            vod_id: e.rid.toString(),
            vod_name: e.roomName,
            vod_pic: e.roomSrc,
            vod_duration: e.nickName,
            ext: {
                id: e.rid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })

    function generateRandomString(length) {
        const values = Array.from({ length }, () => Math.floor(Math.random() * 16))
        return values.map((num) => num.toString(16)).join('')
    }
}
