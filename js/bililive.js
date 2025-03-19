const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
const config = argsify($config_str)

let appConfig = {
    ver: 20250319,
    title: 'bililive',
    site: 'https://live.bilibili.com',
    tabs: [
        {
            name: '網遊',
            ext: {
                id: 0,
                parent_id: 2,
            },
            ui: 1,
        },
        {
            name: '手遊',
            ext: {
                id: 0,
                parent_id: 3,
            },
            ui: 1,
        },
        {
            name: '單機遊戲',
            ext: {
                id: 0,
                parent_id: 6,
            },
            ui: 1,
        },
        {
            name: '娛樂',
            ext: {
                id: 0,
                parent_id: 1,
            },
            ui: 1,
        },
        {
            name: '電台',
            ext: {
                id: 0,
                parent_id: 5,
            },
            ui: 1,
        },
        {
            name: '虛擬主播',
            ext: {
                id: 0,
                parent_id: 9,
            },
            ui: 1,
        },
        {
            name: '聊天室',
            ext: {
                id: 0,
                parent_id: 14,
            },
            ui: 1,
        },
        {
            name: '生活',
            ext: {
                id: 0,
                parent_id: 10,
            },
            ui: 1,
        },
        {
            name: '知識',
            ext: {
                id: 0,
                parent_id: 11,
            },
            ui: 1,
        },
        {
            name: '賽事',
            ext: {
                id: 0,
                parent_id: 13,
            },
            ui: 1,
        },
        {
            name: '互動玩法',
            ext: {
                id: 0,
                parent_id: 15,
            },
            ui: 1,
        },
    ],
}

async function getConfig() {
    $utils.toastInfo('還沒想好登入怎麼寫')
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, parent_id, page = 1 } = ext

    const url = `https://api.live.bilibili.com/xlive/web-interface/v1/second/getList?platform=web&parent_area_id=${parent_id}&area_id=${id}&sort_type=&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
        },
    })

    argsify(data).data.list.forEach((e) => {
        cards.push({
            vod_id: e.roomid.toString(),
            vod_name: e.title,
            vod_pic: `${e.cover}@400w.jpg`,
            vod_duration: e.uname,
            ext: {
                id: e.roomid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let id = ext.id
    let url = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${id}&protocol=0,1&format=0,1,2&codec=0,1&platform=web`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
        },
    })

    let qualitiesMap = {}

    argsify(data).data.playurl_info.playurl.g_qn_desc.forEach((item) => {
        qualitiesMap[parseInt(item.qn) || 0] = item.desc.toString()
    })

    let acceptQn = argsify(data).data.playurl_info.playurl.stream[0].format[0].codec[0].accept_qn
    acceptQn.forEach((item) => {
        tracks.push({
            name: qualitiesMap[item] || '未知清晰度',
            pan: '',
            ext: {
                id,
                qn: item,
            },
        })
    })

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks: tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let { id, qn } = ext
    const url = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${id}&protocol=0,1&format=0,2&codec=0&platform=web&qn=${qn}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
        },
    })

    let streamList = argsify(data).data.playurl_info.playurl.stream
    let urls = []

    streamList.forEach((streamItem) => {
        let formatList = streamItem.format
        formatList.forEach((formatItem) => {
            let codecList = formatItem.codec
            codecList.forEach((codecItem) => {
                let urlList = codecItem.url_info
                let baseUrl = codecItem.base_url.toString()
                urlList.forEach((urlItem) => {
                    urls.push(`${urlItem.host}${baseUrl}${urlItem.extra}`)
                })
            })
        })
    })

    // mcdn 排在後面
    urls.sort((a, b) => (a.includes('mcdn') ? 1 : -1))

    return jsonify({ urls: urls, headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `https://api.bilibili.com/x/web-interface/search/type?context=&search_type=live&cover_type=user_cover&order=&keyword=${text}&category_id=&__refresh__=&_extra=&highlight=0&single_column=0&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
            Cookie: 'buvid3=infoc;',
        },
    })

    argsify(data).data.result.live_room.forEach((e) => {
        cards.push({
            vod_id: e.roomid.toString(),
            vod_name: e.title.replace(/<.*?em.*?>/gm, ''),
            vod_pic: `https:${e.cover}@400w.jpg`,
            vod_duration: e.uname,
            ext: {
                id: e.roomid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}
