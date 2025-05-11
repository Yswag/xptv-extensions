const CryptoJS = createCryptoJS()

let headers = {
    'User-Agent': 'okhttp/4.12.0',
    client: 'app',
    deviceType: 'Android',
}

let appConfig = {
    ver: 20250511,
    title: '零度影視',
    site: 'http://zero.mitotv.com',
}

async function getConfig() {
    headers.deviceId = getDid()
    headers.token = await getTk()

    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(appConfig)
}

async function getTabs() {
    try {
        let list = []
        let url = appConfig.site + `/api/v1/app/screen/screenType`

        const { data } = await $fetch.post(
            url,
            {},
            {
                headers: headers,
            }
        )
        const tagList = argsify(data).data
        tagList.forEach((e) => {
            list.push({
                name: e.name,
                ext: {
                    id: e.id,
                },
            })
        })
        list.push({
            name: '修改排序',
            ext: {
                id: 'reorder',
            },
        })

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext

    if (id === 'reorder') {
        if (page >= 2) return
        return jsonify({
            list: [
                {
                    vod_id: '熱門',
                    vod_name: '熱門',
                    vod_pic: '',
                    ext: {
                        id: 'HOT',
                        text: '熱門',
                        action: 'reorder',
                    },
                },
                {
                    vod_id: '最新',
                    vod_name: '最新',
                    vod_pic: '',
                    ext: {
                        id: 'NEWEST',
                        text: '最新',
                        action: 'reorder',
                    },
                },
                {
                    vod_id: '人氣',
                    vod_name: '人氣',
                    vod_pic: '',
                    ext: {
                        id: 'POPULARITY',
                        text: '人氣',
                        action: 'reorder',
                    },
                },
            ],
        })
    }

    const url = appConfig.site + `/api/v1/app/screen/screenMovie`
    const header = headers
    header['content-type'] = 'application/json'
    const body = {
        condition: {
            sreecnTypeEnum: $cache.get('zero-order') || 'NEWEST',
            typeId: id,
        },
        pageNum: page,
        pageSize: 40,
    }

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    argsify(data).data.records.forEach((e) => {
        cards.push({
            vod_id: e.id,
            vod_name: e.name,
            vod_pic: e.cover,
            vod_remarks: `更新至 ${e.totalEpisode}`,
            ext: {
                id: e.id,
                typeId: id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let { id, typeId } = ext

    if (ext.action === 'reorder') {
        $cache.set('zero-order', ext.id)
        $utils.toastInfo(`排序已修改為: ${ext.text}`)
        return
    }

    // get playerList
    const url = appConfig.site + `/api/v1/app/play/movieDetails`
    const header = headers
    header['content-type'] = 'application/json'
    const body = {
        id: id,
        typeId: typeId,
    }

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    let players = argsify(data).data.moviePlayerList.map((e) => ({
        name: e.moviePlayerName,
        id: e.id,
    }))

    // get all playUrl

    list = await getList()

    return jsonify({
        list: list,
    })

    async function getList() {
        const results = await Promise.all(
            players.map(async (player) => {
                const tracks = await getEpisodeByPlayer(player)
                return {
                    title: player.name,
                    tracks,
                }
            })
        )
        return results
    }

    async function getEpisodeByPlayer(player) {
        let tracks = []
        const body = {
            id: id,
            typeId: typeId,
            playerId: player.id.toString(),
        }

        const { data } = await $fetch.post(url, jsonify(body), {
            headers: header,
        })

        let playlist = argsify(data).data.episodeList
        playlist.forEach((e) => {
            const name = e.episode

            const payload = { ...body, episodeId: e.id.toString() }
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    body: payload,
                },
            })
        })

        return tracks
    }
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let body = ext.body

    const url = appConfig.site + `/api/v1/app/play/movieDetails`
    const header = headers
    header['content-type'] = 'application/json'

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })
    const playerUrl = argsify(data).data.url
    const { data: data2 } = await $fetch.get(appConfig.site + `/api/v1/app/play/analysisMovieUrl?playerUrl=${playerUrl}&playerId=${body.playerId}`, {
        headers: header,
    })
    const playUrl = argsify(data2).data

    return jsonify({ urls: [playUrl], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const page = ext.page || 1
    const url = `${appConfig.site}/api/v1/app/search/searchMovie`
    let body = {
        condition: {
            value: ext.text,
        },
        pageNum: page,
        pageSize: 40,
    }

    const header = headers
    header['content-type'] = 'application/json'

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    argsify(data).data.records.forEach((e) => {
        cards.push({
            vod_id: e.id,
            vod_name: e.name,
            vod_pic: e.cover,
            // vod_remarks: `更新至 ${e.totalEpisode}`,
            ext: {
                id: e.id,
                typeId: e.typeId,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function getDid() {
    let did = $cache.get('zero-did')

    if (!did) {
        const hexChars = '0123456789abcdef'
        did = Array.from({ length: 16 }, () => hexChars[Math.floor(Math.random() * 16)]).join('')

        $cache.set('zero-did', did)
    }

    return did
}

async function getTk() {
    const { data } = await $fetch.get(`${appConfig.site}/api/v1/app/user/visitorInfo`, {
        headers: headers,
    })

    return argsify(data).data.token
}
