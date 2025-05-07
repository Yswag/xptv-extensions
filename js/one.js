const UA = 'Dart/3.3'

let appConfig = {
    ver: 20250507,
    title: 'one源',
    site: 'https://vod.infiniteapi.com',
}

async function getConfig() {
    let config = appConfig
    let token = argsify($config_str).token
    if (!token) {
        $utils.toastInfo('one為biu提供的付費源，請填入token再使用')
        return
    }
    config.tabs = await getTabs(token)
    return jsonify(config)
}

async function getTabs(token) {
    try {
        let list = []
        let url = appConfig.site + `/${token}/one_plugin?param=`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        const tagList = argsify(data).pages
        tagList.forEach((e) => {
            list.push({
                name: e.title,
                ext: {
                    url: e.url,
                },
            })
        })

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        let url = ext.url
        let page = ext.page || 1
        url = url.replace('${pageNumber}', page)

        if (page >= 2 && url.includes('t=2')) {
            $utils.toastInfo('本分类为每日更新推荐，查看更多请切换其他频道分类')
            return
        }

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const list = argsify(data)
        list.forEach((e) => {
            cards.push({
                vod_id: e.id,
                vod_name: e.title,
                vod_pic: e.coverURLString,
                vod_remarks: e.descriptionText || '',
                ext: {
                    url: e.detailURLString,
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    try {
        ext = argsify(ext)
        let tracks = []
        let url = ext.url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).forEach((e) => {
            tracks.push({
                name: e.title,
                pan: '',
                ext: {
                    url: e.episodeDetailURL,
                },
            })
        })

        return jsonify({
            list: [
                {
                    title: '在线',
                    tracks: tracks,
                },
            ],
        })
    } catch (error) {
        $print(error)
    }
}

async function getPlayinfo(ext) {
    try {
        ext = argsify(ext)
        const url = ext.url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let playUrl = argsify(data).playurl
        return jsonify({ urls: [playUrl] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let token = argsify($config_str).token
        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1
        if (page >= 2) return

        const url = appConfig.site + `/${token}/one_vod_json_new?ac=videolist&wd=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let list = argsify(data)
        list.forEach((e) => {
            cards.push({
                vod_id: e.id,
                vod_name: e.title,
                vod_pic: e.coverURLString,
                vod_remarks: e.descriptionText || '',
                ext: {
                    url: e.detailURLString,
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}
