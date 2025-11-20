// const CryptoJS = createCryptoJS()

let appConfig = {
    ver: 20251120,
    title: 'jianpian',
    site: 'https://ev5356.970xw.com',
    tabs: [
        { name: '首頁', ext: { id: 'home' } },
        { name: '電影', ext: { id: 1 } },
        { name: '電視劇', ext: { id: 2 } },
        { name: '動漫', ext: { id: 3 } },
        { name: '綜藝', ext: { id: 4 } },
        { name: '紀錄片', ext: { id: 50 } },
        { name: 'Netflix', ext: { id: 99 } },
    ],
}

async function getConfig() {
    appConfig.imgDomain = await getImgDomain()
    return jsonify(appConfig)
}

async function getImgDomain() {
    let { data } = await $fetch.get(`${appConfig.site}/api/appAuthConfig`, { headers: getHeader() })
    let domain = argsify(data).data.imgDomain

    return domain.startsWith('http') ? domain : 'https://' + domain
}

async function getCards(ext) {
    ext = JSON.parse(ext)
    let cards = []
    let { id, page = 1 } = ext

    if (id === 'home') {
        if (page > 1) return JSON.stringify({ list: [] })
        let url = `${appConfig.site}/api/slide/list?pos_id=88`
        const { data } = await $fetch.get(url, { headers: getHeader() })
        JSON.parse(data).data.forEach((e) => {
            const name = e.title
            const id = e.jump_id
            const pic = appConfig.imgDomain + e.thumbnail

            cards.push({
                vod_id: id.toString(),
                vod_name: name,
                vod_pic: pic,
                ext: { id: id },
            })
        })

        return JSON.stringify({ list: cards })
    } else if (id === 99 || id === 50) {
        if (page > 1) return JSON.stringify({ list: [] })
        let url = `${appConfig.site}/api/dyTag/list?category_id=${id}&page=${page}`
        const { data } = await $fetch.get(url, { headers: getHeader() })
        argsify(data).data.forEach((e) => {
            let duration = e.name
            e.dataList.forEach((item) => {
                const name = item.title
                const id = item.id
                const pic = appConfig.imgDomain + item.path
                const remarks = item.mask
                cards.push({
                    vod_id: id.toString(),
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    vod_duration: duration,
                    ext: { id: id },
                })
            })
        })

        return JSON.stringify({ list: cards })
    }

    let url = `${appConfig.site}/api/crumb/list?fcate_pid=${id}&area=0&year=0&type=0&sort=updata&page=${page}&category_id=`

    const { data } = await $fetch.get(url, { headers: getHeader() })

    JSON.parse(data).data.forEach((e) => {
        const name = e.title
        const id = e.id
        const pic = appConfig.imgDomain + e.path
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: e.mask || '',
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards })
}

async function getTracks(ext) {
    ext = JSON.parse(ext)

    let list = []
    let id = ext.id
    let url = `${appConfig.site}/api/video/detailv2?id=${id}`

    const { data } = await $fetch.get(url, { headers: getHeader() })
    try {
        JSON.parse(data).data.source_list_source.forEach((e) => {
            if (e.source_key === 'back_source_list_p2p') return
            let title = e.name
            let tracks = []
            e.source_list.forEach((item) => {
                tracks.push({
                    name: item.source_name,
                    ext: { url: item.url },
                })
            })
            list.push({
                title,
                tracks,
            })
        })
    } catch (error) {
        $print(error)
    }

    return JSON.stringify({ list: list })
}

async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    let { url } = ext
    let playUrl = url
    let header = getHeader()

    return JSON.stringify({ urls: [playUrl], headers: [header] })
}

async function search(ext) {
    ext = JSON.parse(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/api/v2/search/videoV2?key=${text}&category_id=88&page=${page}&pageSize=20`
    const headers = getHeader()

    const { data } = await $fetch.get(url, { headers: headers })

    JSON.parse(data).data.forEach((e) => {
        const name = e.title
        const id = e.id
        const pic = appConfig.imgDomain + e.thumbnail
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: e.mask || '',
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards })
}

function getHeader() {
    return {
        'User-Agent':
            'Mozilla/5.0 (Linux; Android 9; V2196A Build/PQ3A.190705.08211809; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36;webank/h5face;webank/1.0;netType:NETWORK_WIFI;appVersion:416;packageName:com.jp3.xg3',
        Referer: appConfig.site,
    }
}
