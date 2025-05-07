const cheerio = createCheerio()
const CryptoJS = createCryptoJS()
const UA = 'Dart/3.3'

let appConfig = {
    ver: 20250507,
    title: '加藤視頻',
    site: 'https://5jsd6q7.jnfkdtm.xyz/shorter',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    try {
        let list = []
        let url = appConfig.site + '/tag/videotag/tagAndCategory'

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        const tagList = argsify(data).data.tagList
        tagList.forEach((e) => {
            const videoTagList = e.videoTagList
            videoTagList.forEach((e) => {
                list.push({
                    name: e.tagName,
                    ext: {
                        id: e.id.toString(),
                    },
                    ui: 1,
                })
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
        let id = ext.id
        let page = ext.page || 1

        let url = appConfig.site + `/video/longvideoinfo/pageListByTag?pageNo=${page}&pageSize=20&idList=${id}&sortType=1`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let abcUrl = argsify(data).abcUrl
        let list = argsify(data).data.list
        list.forEach((e) => {
            cards.push({
                vod_id: e.id.toString(),
                vod_name: e.videoName,
                vod_pic: abcUrl + '/' + e.videoImagePreFs,
                vod_remarks: e.fNo || '',
                ext: {
                    id: e.id.toString(),
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
        let id = ext.id

        tracks.push({
            name: 'play',
            pan: '',
            ext: {
                id: id,
            },
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
        const id = ext.id
        let url = appConfig.site + `/video/longvideoinfo/info?id=${id}`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let cosUrl = argsify(data).data.cosUrl
        const videoImage = argsify(data).data.videoImage
        const videoUrlPre = argsify(data).data.videoUrlPre

        if (cosUrl.includes(',')) {
            cosUrl = cosUrl.split(',')[0]
        }

        if (argsify(data).data.isTrysee !== 1) {
            let trailerUrl = ''
            const folder = videoImage ? videoImage.split('/')[0] : ''

            if (videoUrlPre !== null) {
                trailerUrl = `${cosUrl}/${folder}/asy/trailer.m3u8`
            } else if (videoImage) {
                trailerUrl = `${cosUrl}/${folder}/asy/trailer.m3u8`
            }
            $print(trailerUrl)

            return jsonify({ urls: [trailerUrl] })
        } else {
            let path = videoUrlPre.replace(/\/[^\/]+\.\w+$/, '/trailer.m3u8')
            let trailerUrl = cosUrl + '/' + path
            $print(trailerUrl)

            return jsonify({ urls: [trailerUrl] })
        }
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1

        const url = appConfig.site + `/page/${page}/?s=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $('.bt_img.mi_ne_kd ul li').each((_, each) => {
            cards.push({
                vod_id: $(each).find('a').attr('href'),
                vod_name: $(each).find('h3.dytit a').text(),
                vod_pic: $(each).find('img').attr('src'),
                vod_remarks: $(each).find('.dytit .dycategory > a').text(),
                vod_duration: $(each).find('.dytit .dyplayinfo').text().trim(),
                ext: {
                    url: $(each).find('a').attr('href'),
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
