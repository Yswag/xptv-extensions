const CryptoJS = createCryptoJS()

const UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 1,
    title: '金牌影视',
    site: $cache.get('jpyy_host') || 'https://www.cfkj86.com',
    tabs: [
        {
            name: '电影',
            ext: {
                id: 1,
            },
        },
        {
            name: '美剧',
            ext: {
                id: 2,
                area: '美国',
            },
        },
        {
            name: '韩剧',
            ext: {
                id: 2,
                area: '韩国',
            },
        },
        {
            name: '日剧',
            ext: {
                id: 2,
                area: '日本',
            },
        },
        {
            name: '陆剧',
            ext: {
                id: 2,
                area: '中国大陆',
            },
        },
        {
            name: '港剧',
            ext: {
                id: 2,
                area: '中国香港',
            },
        },
        {
            name: '台剧',
            ext: {
                id: 2,
                area: '中国台湾',
            },
        },
        {
            name: '泰剧',
            ext: {
                id: 2,
                area: '泰国',
            },
        },
        {
            name: '其他',
            ext: {
                id: 2,
                area: '其他',
            },
        },
        {
            name: '综艺',
            ext: {
                id: 3,
            },
        },
        {
            name: '动漫',
            ext: {
                id: 4,
            },
        },
        {
            name: 'host選擇',
            ext: {
                id: 55688,
            },
        },
    ],
}

async function getConfig() {
    return JSON.stringify(appConfig)
}

async function getCards(ext) {
    ext = JSON.parse(ext)
    let cards = []
    let { id, area, page = 1 } = ext

    if (id === 55688) {
        if (page > 1) return
        let hostList = [
            {
                vod_id: 'host1',
                vod_name: 'host1',
                vod_pic: '',
                ext: {
                    url: 'https://www.cfkj86.com',
                },
            },
            {
                vod_id: 'host2',
                vod_name: 'host2',
                vod_pic: '',
                ext: {
                    url: 'https://www.hkybqufgh.com',
                },
            },
            {
                vod_id: 'host3',
                vod_name: 'host3',
                vod_pic: '',
                ext: {
                    url: 'https://www.sizhengxt.com',
                },
            },
            {
                vod_id: 'host4',
                vod_name: 'host4',
                vod_pic: '',
                ext: {
                    url: 'https://www.9zhoukj.com',
                },
            },
            {
                vod_id: 'host5',
                vod_name: 'host5',
                vod_pic: '',
                ext: {
                    url: 'https://www.jiabaide.cn',
                },
            },
        ]

        return JSON.stringify({
            list: hostList,
        })
    }

    let url = `${appConfig.site}/api/mw-movie/anonymous/video/list?pageNum=${page}&pageSize=30&sort=1&sortBy=1&type1=${id}`

    if (area) {
        url = `${appConfig.site}/api/mw-movie/anonymous/video/list?area=${area}&pageNum=${page}&pageSize=30&sort=1&sortBy=1&type1=${id}`
    }

    const headers = getHeader(url)

    const response = await $fetch.get(url, {
        headers: headers,
    })
    const data = response.data

    JSON.parse(data).data.list.forEach((e) => {
        const name = e.vodName
        if (name.includes('预告')) return
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: e.vodPic,
            vod_remarks: e.vodDoubanScore.toFixed(1),
            vod_duration: e.vodRemarks.replace(/\|.*/, '') || e.vodVersion,
            vod_pubdate: e.vodPubdate,
            ext: {
                id: id,
            },
        })
    })

    return JSON.stringify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = JSON.parse(ext)

    if (ext.url) {
        $cache.set('jpyy_host', ext.url)
        $utils.toastInfo('域名已修改，重啟生效')
        return
    }

    let tracks = []
    let id = ext.id
    let url = appConfig.site.replace('www', 'm') + '/detail/' + id

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const nidData = '{"' + data.match(/episodeList.*?\[.*?\}\]\}/)[0].replace(/\\\"/g, '"')
    JSON.parse(nidData).episodeList.forEach((e) => {
        tracks.push({
            name: e.name,
            ext: {
                id: id,
                nid: e.nid,
            },
        })
    })

    return JSON.stringify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    let { id, nid } = ext
    const url = `${appConfig.site}/api/mw-movie/anonymous/v2/video/episode/url?id=${id}&nid=${nid}`
    const headers = getHeader(url)

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    let playUrl = JSON.parse(data).data.list[0].url

    return JSON.stringify({ urls: [playUrl] })
}

async function search(ext) {
    ext = JSON.parse(ext)
    let cards = []

    const text = ext.text
    const page = ext.page || 1
    const url = `${appConfig.site}/api/mw-movie/anonymous/video/searchByWordPageable?keyword=${encodeURIComponent(
        text
    )}&pageNum=${page}&pageSize=12&type=false`
    const key = `searchByWordPageable?keyword=${text}&pageNum=${page}&pageSize=12&type=false`
    const headers = getHeader(key)

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    JSON.parse(data).data.list.forEach((e) => {
        const id = e.vodId
        cards.push({
            vod_id: id.toString(),
            vod_name: e.vodName,
            vod_pic: e.vodPic,
            vod_remarks: e.vodDoubanScore.toFixed(1),
            vod_duration: e.vodRemarks.replace(/\|.*/, '') || e.vodVersion,
            vod_pubdate: e.vodPubdate,
            ext: {
                id: id,
            },
        })
    })

    return JSON.stringify({
        list: cards,
    })
}

function getHeader(url) {
    const signKey = 'cb808529bae6b6be45ecfab29a4889bc'
    const dataStr = url.split('?')[1]
    const t = Date.now()
    const signStr = dataStr + `&key=${signKey}` + `&t=${t}`

    function getUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (e) =>
            ('x' === e ? (16 * Math.random()) | 0 : 'r&0x3' | '0x8').toString(16)
        )
    }

    const headers = {
        'User-Agent': UA,
        deviceId: getUUID(),
        t: t.toString(),
        sign: CryptoJS.SHA1(CryptoJS.MD5(signStr).toString()).toString(),
    }

    return headers
}

function selectingHost() {
    let hostList = [
        {
            vod_id: 'host1',
            vod_name: '1',
            vod_pic: '',
            ext: {
                url: 'https://www.cfkj86.com',
            },
        },
        {
            vod_id: 'host2',
            vod_name: '2',
            vod_pic: '',
            ext: {
                url: 'https://www.hkybqufgh.com',
            },
        },
        {
            vod_id: 'host3',
            vod_name: '3',
            vod_pic: '',
            ext: {
                url: 'https://www.sizhengxt.com',
            },
        },
        {
            vod_id: 'host4',
            vod_name: '4',
            vod_pic: '',
            ext: {
                url: 'https://www.9zhoukj.com',
            },
        },
        {
            vod_id: 'host5',
            vod_name: '5',
            vod_pic: '',
            ext: {
                url: 'https://www.jiabaide.cn',
            },
        },
    ]

    return hostList
}
