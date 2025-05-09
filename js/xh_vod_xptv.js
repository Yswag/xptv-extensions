const UA = 'Dart/3.3'

let appConfig = {
    ver: 20250507,
    title: 'Xhamster',
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

        list.push({
            name: `Xhamster`,
            ext: {
                url: `${appConfig.site}/${token}/xh_vod?ac=videolist`,
                token: `${token}`,
            },
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
        url = `${url}&pg=${page}`
        let token = ext.token
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const videoMatches = data.match(/<video>([\s\S]*?)<\/video>/g) || []
        
        for (const videoXml of videoMatches) {
            const nameMatch = videoXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
            const picMatch = videoXml.match(/<pic>(.*?)<\/pic>/)
            const idMatch = videoXml.match(/<id>(.*?)<\/id>/)
            
            cards.push({
                vod_id: idMatch ? idMatch[1] : "",
                vod_name: nameMatch ? nameMatch[1] : "",
                vod_pic: picMatch ? picMatch[1] : "",
                ext: {
                    url: `${appConfig.site}/${token}/xh_vod?ids=${idMatch[1]}`,
                },
            })
        }

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

        // 使用字符串处理方式解析 XML
        const ddMatches = data.match(/<dd flag="">\s*<!\[CDATA\[(.*?)\]\]>\s*<\/dd>/g) || []
        
        for (const ddXml of ddMatches) {
            const contentMatch = ddXml.match(/<!\[CDATA\[(.*?)\]\]>/)
            if (contentMatch) {
                const [title, playUrl] = contentMatch[1].split('$')
                tracks.push({
                    name: title,
                    pan: '',
                    ext: {
                        url: playUrl,
                    },
                })
            }
        }

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
        return jsonify({ urls: [url] })
    } catch (error) {
        $print(error)
    }
}
